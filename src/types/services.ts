/**
 * 服务相关类型定义
 */
// import { ChainConfig, WalletConfig } from './config';
import { Config } from './config.js';

/**
 * 存储服务选项
 */
export interface StorageServiceOptions {
  dataDir: string;
  config: Config;
}

/**
 * 用户数据类型
 */
export interface UserData {
  username: string;
  role: 'admin' | 'user';
  wallets: WalletRecord[];
  contents: Record<string, ContentRecord>;
  settings: UserSettings;
  history: HistoryRecord[];
  metadata?: Record<string, MetadataRecord>; // 添加元数据存储
}

/**
 * 钱包记录类型
 */
export interface WalletRecord {
  id: number;
  privateKey: string;
  address: string;
  createdAt: Date;
}

/**
 * 内容记录类型
 */
export interface ContentRecord {
  id: string;
  ensLabel: string;
  text: string;
  imageUrl?: string;
  imagePath?: string; // 本地文件路径（存储相对路径）
  imageCid?: string;
  status: 'draft' | 'publishing' | 'published' | 'failed';
  createdAt: Date;
  updatedAt?: Date;
  publishedAt?: Date;
  metadataCid?: string;
  metadataPath?: string; // 添加元数据路径（存储相对路径）
  txHash?: string;
}

/**
 * 元数据记录类型
 */
export interface MetadataRecord {
  cid: string;
  path: string; // 元数据文件相对路径
  contentId: string; // 关联的内容ID
  createdAt: Date;
  content?: any; // 元数据内容（可选，不一定需要存储）
}

/**
 * 调度器配置类型
 */
export interface SchedulerConfig {
  enabled: boolean;
  interval: number; // 间隔（秒）
  enabledChains: string[]; // 启用的链
  ensLabels: string[]; // 要发布的社区
  walletIndices: number[]; // 要使用的钱包索引
  cronExpression: string; // Cron表达式
  useRandomContent: boolean; // 是否使用随机内容
  startTime: string | null; // 开始时间
  endTime: string | null; // 结束时间
}

/**
 * 调度器状态类型
 */
export interface SchedulerStatus {
  isRunning: boolean;
  nextRunTime: Date | null;
  lastRunTime: Date | null;
  lastRunResult: {
    success: boolean;
    message: string;
  } | null;
  cronDescription?: string; // 可读的cron描述
}

/**
 * 用户设置类型
 */
export interface UserSettings {
  currentChain: string;
  defaultPrompt: string;
  currentWallet?: number; // 当前选择的钱包索引
  scheduler?: SchedulerConfig; // 调度器配置
}

/**
 * 历史记录类型
 */
export interface HistoryRecord {
  id: string;
  type: 'publish' | 'generate';
  contentId?: string;
  ensLabel?: string;
  txHash?: string;
  status: 'success' | 'fail';
  timestamp: Date;
  message?: string;
}

/**
 * 服务容器接口
 */
export interface ServiceContainer {
  storage: any; // 将在实现时具体化
  blockchain: any;
  ai: any;
  user: any;
  wallet: any;
  chain: any;
  posting: any;
  scheduler: any;
  file: any;
} 