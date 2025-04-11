/**
 * 链服务 - 管理区块链连接和配置
 */
import { BlockchainService } from './blockchain-service.js';
import { StorageService } from './storage-service.js';
import { UserService } from './user-service.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';
import config from '../config/index.js';

/**
 * 链配置接口
 */
export interface ChainConfig {
  name: string;
  rpcUrl: string;
  contractAddress: string;
}

/**
 * 链服务配置
 */
interface ChainServiceOptions {
  blockchain: BlockchainService;
  storage: StorageService;
  user: UserService;
}

/**
 * 链服务类
 */
export class ChainService {
  private blockchain: BlockchainService;
  private storage: StorageService;
  private user: UserService;
  private chainConfig: ChainConfig;

  /**
   * 构造函数
   */
  constructor(options: ChainServiceOptions) {
    this.blockchain = options.blockchain;
    this.storage = options.storage;
    this.user = options.user;
    
    // 使用配置文件中的默认链配置
    this.chainConfig = {
      name: config.DEFAULT_CHAIN as string,
      rpcUrl: config.DEFAULT_RPC_URL as string,
      contractAddress: config.DEFAULT_CONTRACT_ADDRESS as string
    };
  }

  /**
   * 初始化服务
   */
  public async init(): Promise<void> {
    // 获取链配置
    const chainConfig = this.storage.getChainConfig(config.DEFAULT_CHAIN as string);
    if (chainConfig) {
      this.chainConfig = {
        name: config.DEFAULT_CHAIN as string,
        rpcUrl: chainConfig.rpcUrl,
        contractAddress: chainConfig.contractAddress
      };
    }

    logger.info(`链服务初始化完成，使用链: ${this.chainConfig.name}`);
  }

  /**
   * 获取当前链配置
   */
  public getCurrentChainConfig(): ChainConfig {
    return this.chainConfig;
  }

  /**
   * 获取当前链的状态
   */
  public async getChainStatus(): Promise<any> {
    try {
      const provider = this.blockchain.getProvider(this.chainConfig.rpcUrl);
      
      // 获取区块链信息
      const [blockNumber, network, gasPrice] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
        provider.getGasPrice()
      ]);
      
      return {
        name: this.chainConfig.name,
        rpcUrl: this.chainConfig.rpcUrl,
        contractAddress: this.chainConfig.contractAddress,
        blockNumber,
        networkId: network.chainId,
        networkName: network.name,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei') + ' gwei',
        status: 'connected'
      };
    } catch (error) {
      logger.error(`获取链状态失败: ${this.chainConfig.name}`, error);
      
      return {
        name: this.chainConfig.name,
        rpcUrl: this.chainConfig.rpcUrl,
        contractAddress: this.chainConfig.contractAddress,
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