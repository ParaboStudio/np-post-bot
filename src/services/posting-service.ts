/**
 * 发布服务 - 处理内容发布
 */
import fs from 'fs';
import { ethers } from 'ethers';
import FormData from 'form-data';
import axios from 'axios';
import { BlockchainService } from './blockchain-service.js';
import { AIService } from './ai-service.js';
import { StorageService } from './storage-service.js';
import { UserService } from './user-service.js';
import { WalletService } from './wallet-service.js';
import { ChainService } from './chain-service.js';
import { FileService } from './file-service.js';
import { ContentRecord, Config } from '../types/index.js';
import logger from '../utils/logger.js';
import { calculateCID } from '../utils/ipfs-utils.js';
import path from 'path';


/**
 * 发布服务配置
 */
interface PostingServiceOptions {
  blockchain: BlockchainService;
  ai: AIService;
  storage: StorageService;
  user: UserService;
  wallet: WalletService;
  chain: ChainService;
  file: FileService;
  config: Config;
}

/**
 * 社区信息
 */
interface CommunityInfo {
  name: string;
  ensLabel: string;
  tokenAddress: string;
  ticker?: string;
}

/**
 * 发布服务
 */
export class PostingService {
  private blockchain: BlockchainService;
  private ai: AIService;
  private storage: StorageService;
  private user: UserService;
  private wallet: WalletService;
  private chain: ChainService;
  private file: FileService;
  private config: Config;

  /**
   * 构造函数
   */
  constructor(options: PostingServiceOptions) {
    this.blockchain = options.blockchain;
    this.ai = options.ai;
    this.storage = options.storage;
    this.user = options.user;
    this.wallet = options.wallet;
    this.chain = options.chain;
    this.file = options.file;
    this.config = options.config;
  }

  /**
   * 生成内容
   */
  public async generateContent(
    ensLabel: string,
    prompt?: string,
    username?: string
  ): Promise<ContentRecord> {
    const user = username || this.user.getCurrentUser();
    
    try {
      logger.info(`为社区 ${ensLabel} 生成内容...`);
      
      // 1. 查询社区信息
      const communityInfo = await this.fetchCommunityInfo(ensLabel);
      
      // 2. 生成文本内容
      const defaultPrompt = this.ai.generateDefaultPrompt(communityInfo.name);
      const finalPrompt = prompt || defaultPrompt;
      
      logger.info(`使用提示词: ${finalPrompt}`);
      const text = await this.ai.generateText(finalPrompt);
      
      // 3. 生成图片
      const image = await this.ai.generateImage(text, communityInfo.ticker);

      // 3.1 从base64中提取图片数据并保存到文件系统
      const imageBase64 = image.url.split(',')[1];
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const imageFileName = `image_${Date.now()}.png`;
      
      // 3.2 保存图片到文件系统
      const savedImage = await this.file.saveImage(imageBuffer, imageFileName);
      logger.info(`图片已保存：${savedImage.path}, CID: ${savedImage.cid}`);

      // 4. 保存到内容池 - 使用相对路径
      const content = await this.storage.addContent(user, {
        ensLabel,
        text,
        imageUrl: savedImage.relativePath, // 使用相对路径
        imagePath: savedImage.relativePath, // 使用相对路径
        imageCid: savedImage.cid,
        status: 'draft',
        createdAt: new Date()
      });
      
      // 5. 记录历史
      await this.storage.addHistory(user, {
        type: 'generate',
        ensLabel,
        contentId: content.id,
        status: 'success'
      });
      
      logger.info(`内容生成成功，ID: ${content.id}`);
      return content;
    } catch (error: any) {
      logger.error(`为社区 ${ensLabel} 生成内容失败`, error);
      
      // 记录失败历史
      await this.storage.addHistory(user, {
        type: 'generate',
        ensLabel,
        status: 'fail',
        message: (error as Error).message || String(error)
      });
      
      throw error;
    }
  }

  /**
   * 发布内容
   */
  public async publishContent(
    ensLabel: string,
    contentId: string,
    walletIndex?: number,
    username?: string
  ): Promise<{ txHash: string; contentURI: string }> {
    const user = username || this.user.getCurrentUser();
    
    try {
      logger.info(`发布内容 ${contentId} 到社区 ${ensLabel}...`);
      
      // 1. 获取内容
      const content = this.storage.getContent(user, contentId);
      if (!content) {
        throw new Error(`内容不存在: ${contentId}`);
      }
      
      // 2. 检查内容状态
      if (content.status === 'published') {
        throw new Error(`内容已发布: ${contentId}`);
      }
      
      // 3. 更新内容状态
      await this.storage.updateContent(user, contentId, { status: 'publishing' });
      
      // 4. 获取链配置
      const chainConfig = this.chain.getCurrentChainConfig();
      if (!chainConfig) {
        throw new Error('当前链配置不存在');
      }
      
      // 5. 获取钱包
      const index = walletIndex || this.wallet.getCurrentWalletIndex(user);
      const wallet = this.wallet.getWalletInstance(index, chainConfig.rpcUrl, user);
      const walletAddress = wallet.address;
      
      // 6. 查询社区信息
      const communityInfo = await this.fetchCommunityInfo(ensLabel);
      
      // 7. 构建元数据
      const { metadataFile, metadataCid, mediaFiles } = await this.prepareMetadata(
        content,
        walletAddress,
        communityInfo
      );
      
      // 8. 获取合约
      const contractAbi = this.chain.getContractAbi()

      const contract = this.blockchain.getContract(
        chainConfig.contractAddress,
        contractAbi,
        chainConfig.rpcUrl
      );
      const connectedContract = this.blockchain.connectWalletToContract(contract, wallet);
      
      // 9. 调用合约 - 使用新的发帖流程
      const contentURI = `ipfs://${metadataCid}`;
      
      // 10. 查询需要的ETH金额
      logger.info(`查询发布所需ETH金额...`);

      const ethNeeded = await contract.quoteNewPostWithETHNeed(ensLabel);
      logger.info(`发布需要的ETH: ${ethers.utils.formatEther(ethNeeded)} ETH`);
      
      // 11. 发送交易
      logger.info(`使用ETH发布帖子...`);
      const tx = await connectedContract.newPostWithETH(ensLabel, contentURI, {
        value: ethNeeded
      });
      
      logger.info(`交易已发送: ${tx.hash}`);
      
      // 12. 上传到IPFS
      await this.uploadToIPFS(metadataFile, metadataCid, mediaFiles);
      
      // 13. 更新内容状态
      await this.storage.updateContent(user, contentId, {
        status: 'published',
        txHash: tx.hash,
        metadataCid,
        publishedAt: new Date()
      });
      
      // 14. 记录历史
      await this.storage.addHistory(user, {
        type: 'publish',
        contentId,
        ensLabel,
        txHash: tx.hash,
        status: 'success'
      });
      
      logger.info(`内容发布成功，交易哈希: ${tx.hash}`);
      return {
        txHash: tx.hash,
        contentURI
      };
    } catch (error: any) {
      logger.error(`发布内容失败`, error);
      
      // 更新内容状态
      await this.storage.updateContent(user, contentId, { status: 'failed' });
      
      // 记录失败历史
      await this.storage.addHistory(user, {
        type: 'publish',
        contentId,
        ensLabel,
        status: 'fail',
        message: (error as Error).message || String(error)
      });
      
      throw error;
    }
  }

  /**
   * 快速发布
   */
  public async quickPublish(
    ensLabel: string,
    text?: string,
    walletIndex?: number,
    username?: string
  ): Promise<{ txHash: string; contentURI: string; contentId: string }> {
    try {
      // 1. 生成内容
      let content;
      if (text) {
        // 使用给定文本
        const user = username || this.user.getCurrentUser();
        const communityInfo = await this.fetchCommunityInfo(ensLabel);
        
        // 使用AI生成图片
        const image = await this.ai.generateImage(text, communityInfo.ticker);
        
        // 从base64中提取图片数据并保存到文件
        const imageBase64 = image.url.split(',')[1];
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const imageFileName = `image_${Date.now()}.png`;
        
        // 保存图片到文件系统
        const savedImage = await this.file.saveImage(imageBuffer, imageFileName);
        logger.info(`图片已保存：${savedImage.path}, CID: ${savedImage.cid}`);
        
        content = await this.storage.addContent(user, {
          ensLabel,
          text,
          imageUrl: savedImage.relativePath, // 使用相对路径
          imagePath: savedImage.relativePath, // 使用相对路径
          imageCid: savedImage.cid,
          status: 'draft',
          createdAt: new Date()
        });
      } else {
        // 使用AI生成
        content = await this.generateContent(ensLabel, undefined, username);
      }
      
      // 2. 发布内容
      const result = await this.publishContent(ensLabel, content.id, walletIndex, username);
      
      return {
        ...result,
        contentId: content.id
      };
    } catch (error) {
      logger.error(`快速发布失败`, error);
      throw error;
    }
  }

  /**
   * 查询社区信息
   */
  private async fetchCommunityInfo(ensLabel: string): Promise<CommunityInfo> {
    try {
      logger.info(`查询社区信息: ${ensLabel}`);
      
      // 获取链配置
      const chainConfig = this.chain.getCurrentChainConfig();

      if (!chainConfig) {
        throw new Error('当前链配置不存在');
      }
      
      // 构建GraphQL查询
      const query = `
        query CommunityInfo($ensLabel: String!) {
          detail: nameTokenEntities(
            where: {ensLabel: $ensLabel}
          ) {
            id
            name
            symbol
            ensLabel
          }
        }
      `;
      
      const variables = {
        ensLabel
      };
      
      // 获取Graph API配置
      const graphUrl = this.config.GRAPH_URL || 'https://gateway.thegraph.com/api/subgraphs/id/F1FRqTazxbX29N6jDtquPu2HS5Fa7DVBqqCY4ESDD7ux';
      const graphApiKey = this.config.GRAPH_API_KEY || '4863dd4775057bb40128ff9de56c9322';
      
      // 发送查询请求
      const response = await axios.post(
        graphUrl,
        {
          query,
          variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${graphApiKey}`
          }
        }
      );

      if (!response.data?.data?.detail?.[0]) {
        throw new Error(`找不到社区: ${ensLabel}`);
      }
      
      const community = response.data.data.detail[0];
      
      return {
        name: community.name,
        ensLabel: community.ensLabel,
        tokenAddress: community.id,
        ticker: community.symbol
      };
    } catch (error: any) {
      logger.error(`查询社区信息失败: ${ensLabel}`, error);
      throw new Error(`查询社区信息失败: ${(error as Error).message || String(error)}`);
    }
  }

  /**
   * 准备元数据和媒体文件
   */
  private async prepareMetadata(
    content: ContentRecord,
    walletAddress: string,
    communityInfo: CommunityInfo
  ): Promise<{ metadataFile: any; metadataCid: string; mediaFiles: any[] }> {
    try {
      logger.info('准备元数据...');
      
      // 变量声明
      let imageBuffer: Buffer;
      let imageCid = content.imageCid || '';
      
      // 1. 获取图片数据
      // 1.1 根据来源获取图片数据
      if (content.imagePath && content.imageCid) {
        // 从本地文件系统加载图片
        logger.info(`从文件系统加载图片: ${content.imagePath}`);
        try {
          // 尝试直接从文件系统读取
          imageBuffer = this.file.getImageByCID(content.imageCid);
        } catch (error) {
          // 如果CID无法找到，回退到直接读取文件路径
          logger.warn(`通过CID未找到图片，尝试直接从路径加载: ${content.imagePath}`);
          
          // 获取绝对路径 - 手动构建绝对路径
          const absolutePath = path.join(this.config.DATA_DIR, content.imagePath);
          logger.debug(`转换为绝对路径: ${absolutePath}`);
          
          if (fs.existsSync(absolutePath)) {
            imageBuffer = fs.readFileSync(absolutePath);
          } else {
            // 尝试直接使用路径（向后兼容）
            if (fs.existsSync(content.imagePath)) {
              imageBuffer = fs.readFileSync(content.imagePath);
            } else {
              throw new Error(`找不到图片文件: ${content.imagePath}`);
            }
          }
        }
      } else if (content.imageUrl?.startsWith('data:image')) {
        // 兼容旧数据：从base64提取图片数据
        logger.info('从base64提取图片数据');
        const imageBase64 = content.imageUrl.split(',')[1];
        imageBuffer = Buffer.from(imageBase64 || '', 'base64');
        
        // 为图片生成一个CID和文件名
        const imageFileName = `image_${Date.now()}.png`;
        const savedImage = await this.file.saveImage(imageBuffer, imageFileName);
        imageCid = savedImage.cid;
        
        // 更新内容记录 - 使用相对路径
        await this.storage.updateContent(this.user.getCurrentUser(), content.id, {
          imageCid: savedImage.cid,
          imagePath: savedImage.relativePath
        });
      } else {
        throw new Error('无效的图片数据');
      }
      
      // 2. 获取图片元数据
      const imageRandom = Math.random().toString(36).substring(2, 8);
      const imageFileName = `${imageRandom}_image_${Date.now()}.png`;
      
      // 3. 构建元数据
      const metadataObj = {
        version: "0.0.1",
        content: {
          title: "",
          text: content.text,
          type: "text/plain",
        },
        media: {
          images: [
            {
              cid: imageCid,
              url: `ipfs://${imageCid}`,
              metadata: {
                format: "png",
                size: imageBuffer.length,
                name: imageFileName,
              },
            },
          ],
          videos: [],
        },
        links: [],
        author: {
          ens: "",
          address: walletAddress,
        },
        token: {
          name: communityInfo.name,
          address: communityInfo.tokenAddress,
        },
      };
      
      // 4. 将元数据对象转为JSON字符串
      const metadataStr = JSON.stringify(metadataObj);
      const metadataBuffer = Buffer.from(metadataStr);
      
      // 5. 生成唯一文件名
      const metadataFileName = `${communityInfo.name}_${Date.now()}.json`;
      
      // 6. 计算元数据CID
      let metadataCid = '';
      try {
        // 通过FileService计算并保存元数据
        const metadataFile = {
          data: metadataBuffer,
          name: metadataFileName
        };
        metadataCid = await calculateCID(metadataFile);
        
        // 保存元数据文件，并获取保存信息
        const savedMetadata = this.file.saveMetadata(metadataBuffer, metadataCid);
        
        // 将元数据记录添加到存储服务
        const user = this.user.getCurrentUser();
        await this.storage.addMetadata(user, {
          cid: metadataCid,
          path: savedMetadata.relativePath,
          contentId: content.id,
          content: metadataObj // 可选存储元数据内容
        });
        
        logger.info(`元数据已保存: ${savedMetadata.path}, CID: ${metadataCid}`);
      } catch (error) {
        // 如果计算失败，使用随机CID（不推荐，但作为fallback）
        logger.error('计算元数据CID失败，使用随机值', error);
        metadataCid = `Qm${Math.random().toString(36).substring(2, 40)}`;
      }
      
      // 7. 返回元数据和媒体文件
      return {
        metadataFile: {
          name: metadataFileName,
          data: metadataBuffer,
          type: 'application/json'
        },
        metadataCid,
        mediaFiles: [{
          name: imageFileName,
          data: imageBuffer,
          cid: imageCid,
          type: 'image/png'
        }]
      };
    } catch (error: any) {
      logger.error('准备元数据失败', error);
      throw new Error(`准备元数据失败: ${(error as Error).message || String(error)}`);
    }
  }

  /**
   * 上传到IPFS
   */
  private async uploadToIPFS(
    metadataFile: any,
    metadataCid: string,
    mediaFiles: any[]
  ): Promise<void> {
    try {
      logger.info('上传内容到IPFS...');
      
      // 获取链配置
      const chainConfig = this.chain.getCurrentChainConfig();
      if (!chainConfig) {
        throw new Error('当前链配置不存在');
      }
      
      // 创建FormData
      const formData = new FormData();
      
      // 添加元数据文件
      formData.append('metadataFile', metadataFile.data, {
        filename: metadataFile.name,
      });
      formData.append('metadataCid', metadataCid);
      
      // 添加媒体文件
      mediaFiles.forEach((media) => {
        formData.append(`image_${media.cid}`, media.data, { filename: media.name });
      });
      
      // 发送请求
      const response = await axios.post(
        `${this.config.BASE_URL}/api/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          }
        }
      );
      
      if (!response.status?.toString()?.startsWith('2')) {
        throw new Error(`上传失败: ${response.status}`);
      }
      
      logger.info('上传IPFS成功');
    } catch (error: any) {
      logger.error('上传IPFS失败', error);
      throw new Error(`上传IPFS失败: ${(error as Error).message || String(error)}`);
    }
  }
} 