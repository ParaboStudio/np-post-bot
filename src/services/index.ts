/**
 * 服务初始化和导出
 */
import { StorageService } from './storage-service.js';
import { BlockchainService } from './blockchain-service.js';
import { AIService } from './ai-service.js';
import { PostingService } from './posting-service.js';
import { WalletService } from './wallet-service.js';
import { ChainService } from './chain-service.js';
import { UserService } from './user-service.js';
import { SchedulerService } from './scheduler-service.js';
import { FileService } from './file-service.js';
import { Config } from '../types/index.js';
import logger from '../utils/logger.js';
import path from 'path';

// 服务容器接口
export interface ServiceContainer {
  storage: StorageService;
  blockchain: BlockchainService;
  ai: AIService;
  user: UserService;
  wallet: WalletService;
  chain: ChainService;
  posting: PostingService;
  scheduler: SchedulerService;
  file: FileService;
}

/**
 * 初始化所有服务
 */
export async function initServices(config: Config): Promise<ServiceContainer> {
  logger.info('初始化服务容器...');

  // 初始化基础服务
  logger.debug('初始化存储服务...');
  const storage = new StorageService({ dataDir: config.DATA_DIR, config });
  
  logger.debug('初始化区块链服务...');
  const blockchain = new BlockchainService();
  
  logger.debug('初始化AI服务...');
  const ai = new AIService(config);
  
  // 初始化文件服务
  logger.debug('初始化文件服务...');
  const file = new FileService({
    baseDir: config.DATA_DIR,
    imagesDir: path.join(config.DATA_DIR, 'images'),
    metadataDir: path.join(config.DATA_DIR, 'metadata'),
    useMemoryCache: true
  });
  
  // 初始化用户服务 (其他服务依赖它)
  logger.debug('初始化用户服务...');
  const user = new UserService({ storage });
  
  // 初始化业务服务
  logger.debug('初始化钱包服务...');
  const wallet = new WalletService({ 
    blockchain, 
    storage,
    user
  });
  
  logger.debug('初始化链服务...');
  const chain = new ChainService({ 
    blockchain, 
    storage,
    user
  });
  
  logger.debug('初始化发布服务...');
  const posting = new PostingService({ 
    blockchain, 
    ai, 
    storage,
    user,
    wallet,
    chain,
    file,
    config
  });

  logger.debug('初始化调度器服务...');
  const scheduler = new SchedulerService({
    posting,
    storage,
    user,
    chain
  });
  
  logger.info('服务容器初始化完成');
  
  // 返回所有服务
  return {
    storage,
    blockchain,
    ai,
    user,
    wallet,
    chain,
    posting,
    scheduler,
    file
  };
}

// 导出所有服务类
export * from './storage-service.js';
export * from './blockchain-service.js';
export * from './ai-service.js';
export * from './posting-service.js';
export * from './wallet-service.js';
export * from './chain-service.js';
export * from './user-service.js';
export * from './scheduler-service.js';
export * from './file-service.js'; 