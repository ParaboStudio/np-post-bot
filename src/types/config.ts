/**
 * 配置相关类型定义
 */

/**
 * 应用配置类型
 */
export interface Config {
  // 基础配置
  DATA_DIR: string;
  BASE_URL: string;
  VERSION?: string;
  
  // 区块链配置
  DEFAULT_CHAIN: string;
  DEFAULT_CONTRACT_ADDRESS?: string;
  DEFAULT_RPC_URL?: string;
  
  // Bot平台配置
  TELEGRAM_TOKEN?: string;
  LARK_APP_ID?: string;
  LARK_APP_SECRET?: string;
  
  // 日志配置
  LOG_LEVEL: string;
  
  // Graph API配置
  GRAPH_URL?: string;
  GRAPH_API_KEY?: string;
  
  // AI服务配置
  AI_TEXT_ENDPOINT?: string;
  AI_IMAGE_ENDPOINT?: string;
  
  // 工具方法
  ensureDirectories: () => void;
}

/**
 * 链配置类型
 */
export interface ChainConfig {
  name: string;
  rpcUrl: string;
  contractAddress: string;
}

/**
 * 钱包配置类型
 */
export interface WalletConfig {
  privateKey: string;
  address: string;
} 