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
} 