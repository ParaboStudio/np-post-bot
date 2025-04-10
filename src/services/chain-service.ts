/**
 * 链服务 - 管理区块链网络和配置
 */
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain-service.js';
import { StorageService } from './storage-service.js';
import { UserService } from './user-service.js';
import logger from '../utils/logger.js';

/**
 * 链服务配置
 */
interface ChainServiceOptions {
  blockchain: BlockchainService;
  storage: StorageService;
  user: UserService;
}

/**
 * 链配置
 */
export interface ChainInfo {
  name: string;
  rpcUrl: string;
  contractAddress: string;
}

/**
 * 链服务
 */
export class ChainService {
  private blockchain: BlockchainService;
  private storage: StorageService;
  private user: UserService;

  /**
   * 构造函数
   */
  constructor(options: ChainServiceOptions) {
    this.blockchain = options.blockchain;
    this.storage = options.storage;
    this.user = options.user;
  }

  /**
   * 获取所有链配置
   */
  public getAllChains(): Record<string, { rpcUrl: string; contractAddress: string }> {
    return this.storage.getAllChains();
  }

  /**
   * 获取链配置
   */
  public getChainConfig(name: string): { rpcUrl: string; contractAddress: string } | null {
    return this.storage.getChainConfig(name);
  }

  /**
   * 获取当前选择的链
   */
  public getCurrentChain(username?: string): string {
    const user = username || this.user.getCurrentUser();
    const settings = this.storage.getUserSettings(user);
    return settings?.currentChain || this.storage.getDefaultChain();
  }

  /**
   * 获取当前链配置
   */
  public getCurrentChainConfig(username?: string): { rpcUrl: string; contractAddress: string } | null {
    const chainName = this.getCurrentChain(username);
    return this.getChainConfig(chainName);
  }

  /**
   * 添加或更新链配置
   */
  public async setChainConfig(name: string, rpcUrl: string, contractAddress: string): Promise<void> {
    try {
      // 验证RPC URL是否有效
      const provider = this.blockchain.getProvider(rpcUrl);
      await provider.getNetwork();
      
      // 保存配置
      await this.storage.setChainConfig(name, {
        rpcUrl,
        contractAddress
      });
      
      logger.info(`链配置已更新: ${name}`);
    } catch (error) {
      logger.error(`设置链配置失败: ${name}`, error);
      throw new Error(`无法连接到RPC URL: ${rpcUrl}`);
    }
  }

  /**
   * 删除链配置
   */
  public async deleteChainConfig(name: string): Promise<boolean> {
    try {
      // 检查是否是当前链
      const currentChain = this.getCurrentChain();
      if (currentChain === name) {
        throw new Error(`无法删除当前选择的链: ${name}，请先切换到其他链`);
      }
      
      const result = await this.storage.deleteChainConfig(name);
      if (result) {
        logger.info(`链配置已删除: ${name}`);
      } else {
        logger.warn(`链配置不存在: ${name}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`删除链配置失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 设置当前链
   */
  public async setCurrentChain(name: string, username?: string): Promise<boolean> {
    const user = username || this.user.getCurrentUser();
    
    // 检查链是否存在
    const chainConfig = this.storage.getChainConfig(name);
    if (!chainConfig) {
      throw new Error(`链不存在: ${name}`);
    }
    
    try {
      // 更新用户设置
      await this.storage.updateUserSettings(user, { currentChain: name });
      logger.info(`用户 ${user} 当前链已设置为: ${name}`);
      return true;
    } catch (error) {
      logger.error(`设置当前链失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 获取当前链的状态
   */
  public async getChainStatus(name?: string): Promise<any> {
    const chainName = name || this.getCurrentChain();
    const config = this.storage.getChainConfig(chainName);
    
    if (!config) {
      throw new Error(`链不存在: ${chainName}`);
    }
    
    try {
      const provider = this.blockchain.getProvider(config.rpcUrl);
      
      // 获取区块链信息
      const [blockNumber, network, gasPrice] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
        provider.getGasPrice()
      ]);
      
      return {
        name: chainName,
        rpcUrl: config.rpcUrl,
        contractAddress: config.contractAddress,
        blockNumber,
        networkId: network.chainId,
        networkName: network.name,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei') + ' gwei',
        status: 'connected'
      };
    } catch (error) {
      logger.error(`获取链状态失败: ${chainName}`, error);
      
      return {
        name: chainName,
        rpcUrl: config.rpcUrl,
        contractAddress: config.contractAddress,
        status: 'error',
        error: '无法连接到RPC URL'
      };
    }
  }

  /**
   * 获取合约ABI
   */
  public getContractAbi(): any[] {
    // 发帖相关的固定ABI
    return [
      "function post(address communityToken, string contentURI) external returns (uint256)",
      "function quoteNewPostWithETHNeed(string ensLabel) external view returns (uint256)",
      "function newPostWithETH(string ensLabel, string contentURI) external payable returns (uint256)",
    ];
  }
} 