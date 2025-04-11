/**
 * 钱包服务 - 管理钱包和密钥
 */
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain-service.js';
import { StorageService } from './storage-service.js';
import { UserService } from './user-service.js';
import { WalletRecord } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * 钱包服务配置
 */
interface WalletServiceOptions {
  blockchain: BlockchainService;
  storage: StorageService;
  user: UserService;
}

/**
 * 钱包派生结果
 */
export interface HDWalletGenerationResult {
  mnemonic: string;
  wallets: WalletRecord[];
}

/**
 * 批量资金转移结果接口
 */
export interface FundTransferResult {
  transfers: {
    walletId: number;
    address: string;
    amount: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }[];
}

/**
 * 钱包余额查询结果
 */
export interface WalletBalanceResult {
  address: string;
  balance: ethers.BigNumber;
  walletIndex: number;
}

/**
 * 资金发送结果
 */
export interface SendFundsResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  gasUsed: string;
}

/**
 * 批量资金分发结果
 */
export interface DistributeFundsResult {
  transfers: {
    walletId: number;
    address: string;
    amount: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }[];
}

/**
 * 批量打ETH结果
 */
export interface BatchSendEthResult {
  transfers: {
    address: string;
    amount: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }[];
}

/**
 * 钱包服务
 */
export class WalletService {
  private blockchain: BlockchainService;
  private storage: StorageService;
  private user: UserService;

  /**
   * 构造函数
   */
  constructor(options: WalletServiceOptions) {
    this.blockchain = options.blockchain;
    this.storage = options.storage;
    this.user = options.user;
  }

  /**
   * 获取钱包列表
   */
  public getWallets(username?: string): WalletRecord[] {
    const user = username || this.user.getCurrentUser();
    return this.storage.getWallets(user);
  }

  /**
   * 获取钱包详情
   */
  public async getWalletDetails(index: number, rpcUrl: string, username?: string): Promise<any> {
    const user = username || this.user.getCurrentUser();
    const wallets = this.storage.getWallets(user);
    
    if (index < 1 || index > wallets.length) {
      throw new Error(`无效的钱包索引: ${index}`);
    }

    const wallet = wallets.find(w => w.id === index);
    if (!wallet) {
      throw new Error(`找不到索引为 ${index} 的钱包`);
    }

    try {
      // 获取钱包余额
      const balance = await this.blockchain.getBalance(wallet.address, rpcUrl);
      
      return {
        id: wallet.id,
        address: wallet.address,
        balance,
        createdAt: wallet.createdAt
      };
    } catch (error) {
      logger.error(`获取钱包详情失败: ${wallet.address}`, error);
      return {
        id: wallet.id,
        address: wallet.address,
        balance: '未知',
        createdAt: wallet.createdAt,
        error: '获取钱包余额失败'
      };
    }
  }

  /**
   * 添加钱包
   */
  public async addWallet(privateKey: string, username?: string): Promise<WalletRecord> {
    const user = username || this.user.getCurrentUser();
    
    try {
      // 获取钱包地址
      const address = this.blockchain.getAddressFromPrivateKey(privateKey);
      
      // 检查钱包是否已存在
      const wallets = this.storage.getWallets(user);
      const existingWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
      
      if (existingWallet) {
        throw new Error(`钱包已存在，索引: ${existingWallet.id}`);
      }
      
      // 添加钱包
      const wallet = await this.storage.addWallet(user, privateKey, address);
      logger.info(`为用户 ${user} 添加钱包成功: ${address}`);
      
      return wallet;
    } catch (error) {
      logger.error(`添加钱包失败`, error);
      throw error;
    }
  }

  /**
   * 生成HD钱包 - 从助记词派生出多个钱包
   * @param count 要生成的钱包数量，默认为20
   * @param mnemonic 可选的助记词，如果不提供则随机生成
   * @param username 用户名，默认使用当前用户
   * @returns 返回助记词和派生的钱包列表
   */
  public async generateHDWallets(count: number = 20, mnemonic?: string, username?: string): Promise<HDWalletGenerationResult> {
    const user = username || this.user.getCurrentUser();
    
    try {
      // 生成随机助记词，或使用提供的助记词
      let generatedMnemonic: string;
      let hdNode: ethers.utils.HDNode;
      
      if (mnemonic) {
        // 使用提供的助记词
        hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
        generatedMnemonic = mnemonic;
      } else {
        // 生成随机助记词
        generatedMnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(16));
        hdNode = ethers.utils.HDNode.fromMnemonic(generatedMnemonic);
      }
      
      // 派生路径 m/44'/60'/0'/0/
      const derivationPath = "m/44'/60'/0'/0/";
      
      // 存储已添加的钱包
      const addedWallets: WalletRecord[] = [];
      
      // 从HD节点派生指定数量的钱包
      for (let i = 0; i < count; i++) {
        // 派生子钱包
        const childNode = hdNode.derivePath(`${derivationPath}${i}`);
        const privateKey = childNode.privateKey;
        const address = childNode.address;
        
        // 检查钱包是否已存在
        const wallets = this.storage.getWallets(user);
        const existingWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
        
        if (existingWallet) {
          logger.info(`钱包已存在，跳过添加: ${address}`);
          continue;
        }
        
        // 添加钱包
        const wallet = await this.storage.addWallet(user, privateKey, address);
        addedWallets.push(wallet);
        logger.info(`为用户 ${user} 添加派生钱包成功: ${address}`);
      }
      
      return {
        mnemonic: generatedMnemonic,
        wallets: addedWallets
      };
    } catch (error) {
      logger.error(`生成HD钱包失败`, error);
      throw error;
    }
  }

  /**
   * 删除钱包
   */
  public async deleteWallet(index: number, username?: string): Promise<boolean> {
    const user = username || this.user.getCurrentUser();
    
    try {
      const result = await this.storage.deleteWallet(user, index);
      logger.info(`为用户 ${user} 删除钱包成功: 索引 ${index}`);
      return result;
    } catch (error) {
      logger.error(`删除钱包失败: 索引 ${index}`, error);
      throw error;
    }
  }

  /**
   * 清除所有钱包
   */
  public async clearWallets(username?: string): Promise<boolean> {
    const user = username || this.user.getCurrentUser();
    
    try {
      const result = await this.storage.clearWallets(user);
      logger.info(`为用户 ${user} 清除所有钱包成功`);
      return result;
    } catch (error) {
      logger.error(`清除钱包失败`, error);
      throw error;
    }
  }

  /**
   * 获取当前钱包索引
   */
  public getCurrentWalletIndex(username?: string): number {
    const user = username || this.user.getCurrentUser();
    const userData = this.storage.getUserData(user);
    
    return userData?.settings?.currentWallet || 1;
  }

  /**
   * 设置当前钱包
   */
  public async setCurrentWallet(index: number, username?: string): Promise<boolean> {
    const user = username || this.user.getCurrentUser();
    const wallets = this.storage.getWallets(user);
    
    if (index < 1 || index > wallets.length) {
      throw new Error(`无效的钱包索引: ${index}`);
    }
    
    try {
      await this.storage.updateUserSettings(user, { currentWallet: index });
      logger.info(`为用户 ${user} 设置当前钱包: 索引 ${index}`);
      return true;
    } catch (error) {
      logger.error(`设置当前钱包失败: 索引 ${index}`, error);
      throw error;
    }
  }

  /**
   * 获取钱包实例
   */
  public getWalletInstance(index: number, rpcUrl: string, username?: string): ethers.Wallet {
    const user = username || this.user.getCurrentUser();
    const wallets = this.storage.getWallets(user);
    
    if (index < 1 || index > wallets.length) {
      throw new Error(`无效的钱包索引: ${index}`);
    }

    const wallet = wallets.find(w => w.id === index);
    if (!wallet) {
      throw new Error(`找不到索引为 ${index} 的钱包`);
    }
    
    return this.blockchain.createWallet(wallet.privateKey, rpcUrl);
  }

  /**
   * 获取当前钱包实例
   */
  public getCurrentWalletInstance(rpcUrl: string, username?: string): ethers.Wallet {
    const index = this.getCurrentWalletIndex(username);
    return this.getWalletInstance(index, rpcUrl, username);
  }

  /**
   * 将所有钱包的资产批量转移到安全地址
   * @param targetAddress 目标安全地址
   * @param rpcUrl RPC URL
   * @param minAmount 最小转账金额（ETH），默认0.001
   * @param username 用户名，默认当前用户
   * @returns 转账结果
   */
  public async transferAllFunds(
    targetAddress: string,
    rpcUrl: string,
    minAmount: string = '0.001',
    username?: string
  ): Promise<FundTransferResult> {
    const user = username || this.user.getCurrentUser();
    
    // 结果初始化
    const result: FundTransferResult = {
      transfers: []
    };

    try {
      // 获取所有钱包
      const wallets = this.storage.getWallets(user);
      
      if (wallets.length === 0) {
        logger.warn(`用户 ${user} 没有可用的钱包`);
        return result;
      }

      logger.info(`开始为用户 ${user} 从 ${wallets.length} 个钱包转移资金到安全地址 ${targetAddress}`);
      
      // 最小转账阈值（Wei）
      const minAmountWei = ethers.utils.parseEther(minAmount);
      
      // 为每个钱包检查余额并执行转账
      const transferPromises = wallets.map(async (wallet) => {
        try {
          // 创建钱包实例
          const provider = this.blockchain.getProvider(rpcUrl);
          const walletInstance = new ethers.Wallet(wallet.privateKey, provider);
          
          // 获取余额
          const balance = await walletInstance.getBalance();
          
          // 转账结果初始化
          const transferResult = {
            walletId: wallet.id,
            address: wallet.address,
            amount: ethers.utils.formatEther(balance),
            success: false,
            txHash: undefined as string | undefined
          };
          
          // 如果余额低于最小阈值，则跳过
          if (balance.lt(minAmountWei)) {
            logger.info(`钱包 ${wallet.address} 余额过低(${ethers.utils.formatEther(balance)} ETH)，小于 ${minAmount} ETH，跳过转账`);
            return transferResult;
          }
          
          // 计算可转账金额（减去gas费用）
          // 预留21000(基本转账gas) * 30gwei 的gas费用
          const gasLimit = 21000;
          const gasPrice = await provider.getGasPrice(); // 获取当前gas价格
          const gasCost = gasLimit * gasPrice.toNumber();
          
          // 如果余额小于gas费用，则跳过
          if (balance.lte(gasCost)) {
            logger.info(`钱包 ${wallet.address} 余额(${ethers.utils.formatEther(balance)} ETH)不足以支付gas费用，跳过转账`);
            return transferResult;
          }
          
          // 计算实际可转账金额
          const transferAmount = balance.sub(gasCost);
          
          // 执行转账
          logger.info(`正在从钱包 ${wallet.address} 转移 ${ethers.utils.formatEther(transferAmount)} ETH 到安全地址 ${targetAddress}`);
          
          const tx = await walletInstance.sendTransaction({
            to: targetAddress,
            value: transferAmount,
            gasLimit
          });
          
          // 等待交易确认
          const receipt = await tx.wait(1);
          
          // 更新转账结果
          transferResult.success = true;
          transferResult.txHash = tx.hash;
          transferResult.amount = ethers.utils.formatEther(transferAmount);
          
          logger.info(`从钱包 ${wallet.address} 成功转移 ${transferResult.amount} ETH 到安全地址，交易哈希: ${tx.hash}`);
          
          return transferResult;
        } catch (error) {
          logger.error(`从钱包 ${wallet.address} 转移资金失败`, error);
          return {
            walletId: wallet.id,
            address: wallet.address,
            amount: '0',
            success: false,
            error: (error as Error).message || String(error)
          };
        }
      });
      
      // 等待所有转账完成
      result.transfers = await Promise.all(transferPromises);
      
      // 统计成功数量和总转账金额
      const successCount = result.transfers.filter(t => t.success).length;
      const totalAmount = result.transfers
        .filter(t => t.success)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        .toFixed(6);
      
      logger.info(`批量资金转移完成: ${successCount}/${wallets.length} 个钱包成功，总计转移 ${totalAmount} ETH`);
      
      return result;
    } catch (error) {
      logger.error(`执行批量资金转移失败`, error);
      throw error;
    }
  }

  /**
   * 查询钱包余额
   */
  public async getWalletBalance(walletIndex?: number, rpcUrl?: string, username?: string): Promise<WalletBalanceResult> {
    const user = username || this.user.getCurrentUser();
    const index = walletIndex || this.getCurrentWalletIndex(user);
    
    // 获取钱包
    const wallets = this.getWallets(user);
    if (index < 1 || index > wallets.length) {
      throw new Error(`无效的钱包索引: ${index}`);
    }
    
    const wallet = wallets.find(w => w.id === index);
    if (!wallet) {
      throw new Error(`找不到索引为 ${index} 的钱包`);
    }
    
    // 获取RPC URL
    const rpcEndpoint = rpcUrl || this.blockchain.getDefaultRpcUrl();
    if (!rpcEndpoint) {
      throw new Error('未配置有效的RPC URL');
    }
    
    // 获取提供者
    const provider = this.blockchain.getProvider(rpcEndpoint);
    
    // 查询余额
    const balance = await provider.getBalance(wallet.address);
    
    return {
      address: wallet.address,
      balance,
      walletIndex: index
    };
  }
  
  /**
   * 发送资金
   */
  public async sendFunds(toAddress: string, amount: string, walletIndex?: number, username?: string): Promise<SendFundsResult> {
    const user = username || this.user.getCurrentUser();
    const index = walletIndex || this.getCurrentWalletIndex(user);
    
    // 验证地址格式
    if (!ethers.utils.isAddress(toAddress)) {
      throw new Error('无效的接收地址格式');
    }
    
    // 获取RPC URL
    const rpcUrl = this.blockchain.getDefaultRpcUrl();
    if (!rpcUrl) {
      throw new Error('未配置有效的RPC URL');
    }
    
    // 获取钱包实例
    const wallet = this.getWalletInstance(index, rpcUrl, user);
    
    // 解析金额为wei
    const amountWei = ethers.utils.parseEther(amount);
    
    // 检查余额
    const balance = await wallet.getBalance();
    if (balance.lt(amountWei)) {
      throw new Error(`余额不足，当前余额: ${ethers.utils.formatEther(balance)} ETH`);
    }
    
    // 发送交易
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    return {
      txHash: tx.hash,
      from: wallet.address,
      to: toAddress,
      amount,
      gasUsed: receipt.gasUsed.toString()
    };
  }
  
  /**
   * 向多个钱包分发资金
   */
  public async distributeFunds(amount: string, walletIndices: number[], username?: string): Promise<DistributeFundsResult> {
    const user = username || this.user.getCurrentUser();
    const wallets = this.getWallets(user);
    const results: DistributeFundsResult = { transfers: [] };
    
    // 获取RPC URL
    const rpcUrl = this.blockchain.getDefaultRpcUrl();
    if (!rpcUrl) {
      throw new Error('未配置有效的RPC URL');
    }
    
    // 获取当前钱包作为资金来源
    const sourceWalletIndex = this.getCurrentWalletIndex(user);
    const sourceWallet = this.getWalletInstance(sourceWalletIndex, rpcUrl, user);
    
    // 解析金额为wei
    const amountWei = ethers.utils.parseEther(amount);
    
    // 计算总需要金额
    const totalAmountWei = amountWei.mul(walletIndices.length);
    
    // 检查余额
    const balance = await sourceWallet.getBalance();
    if (balance.lt(totalAmountWei)) {
      throw new Error(`余额不足，当前余额: ${ethers.utils.formatEther(balance)} ETH，需要: ${ethers.utils.formatEther(totalAmountWei)} ETH`);
    }
    
    // 批量发送
    for (const targetIndex of walletIndices) {
      try {
        if (targetIndex < 1 || targetIndex > wallets.length) {
          results.transfers.push({
            walletId: targetIndex,
            address: 'unknown',
            amount,
            success: false,
            error: `无效的钱包索引: ${targetIndex}`
          });
          continue;
        }
        
        const targetWallet = wallets.find(w => w.id === targetIndex);
        if (!targetWallet) {
          results.transfers.push({
            walletId: targetIndex,
            address: 'unknown',
            amount,
            success: false,
            error: `找不到索引为 ${targetIndex} 的钱包`
          });
          continue;
        }
        
        // 发送交易
        const tx = await sourceWallet.sendTransaction({
          to: targetWallet.address,
          value: amountWei
        });
        
        // 等待交易确认
        const receipt = await tx.wait();
        
        results.transfers.push({
          walletId: targetIndex,
          address: targetWallet.address,
          amount,
          success: true,
          txHash: tx.hash
        });
      } catch (error) {
        results.transfers.push({
          walletId: targetIndex,
          address: wallets.find(w => w.id === targetIndex)?.address || 'unknown',
          amount,
          success: false,
          error: (error as Error).message || String(error)
        });
      }
    }
    
    return results;
  }
  
  /**
   * 批量打ETH到钱包
   */
  public async batchSendEth(amount: string, walletList: string[], username?: string): Promise<BatchSendEthResult> {
    const user = username || this.user.getCurrentUser();
    const results: BatchSendEthResult = { transfers: [] };
    
    // 获取RPC URL
    const rpcUrl = this.blockchain.getDefaultRpcUrl();
    if (!rpcUrl) {
      throw new Error('未配置有效的RPC URL');
    }
    
    // 获取当前钱包作为资金来源
    const sourceWalletIndex = this.getCurrentWalletIndex(user);
    const sourceWallet = this.getWalletInstance(sourceWalletIndex, rpcUrl, user);
    
    // 解析金额为wei
    const amountWei = ethers.utils.parseEther(amount);
    
    // 计算总需要金额
    const totalAmountWei = amountWei.mul(walletList.length);
    
    // 检查余额
    const balance = await sourceWallet.getBalance();
    if (balance.lt(totalAmountWei)) {
      throw new Error(`余额不足，当前余额: ${ethers.utils.formatEther(balance)} ETH，需要: ${ethers.utils.formatEther(totalAmountWei)} ETH`);
    }
    
    // 批量发送
    for (const targetAddress of walletList) {
      try {
        // 处理可能是钱包索引的情况
        let actualAddress = targetAddress;
        
        if (!isNaN(parseInt(targetAddress))) {
          const walletIndex = parseInt(targetAddress);
          const wallets = this.getWallets(user);
          
          if (walletIndex >= 1 && walletIndex <= wallets.length) {
            const targetWallet = wallets.find(w => w.id === walletIndex);
            if (targetWallet) {
              actualAddress = targetWallet.address;
            }
          }
        }
        
        // 验证地址格式
        if (!ethers.utils.isAddress(actualAddress)) {
          results.transfers.push({
            address: actualAddress,
            amount,
            success: false,
            error: '无效的地址格式'
          });
          continue;
        }
        
        // 发送交易
        const tx = await sourceWallet.sendTransaction({
          to: actualAddress,
          value: amountWei
        });
        
        // 等待交易确认
        const receipt = await tx.wait();
        
        results.transfers.push({
          address: actualAddress,
          amount,
          success: true,
          txHash: tx.hash
        });
      } catch (error) {
        results.transfers.push({
          address: targetAddress,
          amount,
          success: false,
          error: (error as Error).message || String(error)
        });
      }
    }
    
    return results;
  }
} 