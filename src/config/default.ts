/**
 * 默认配置
 */
import { Config } from '../types/index.js';
import path from 'path';
import { LogLevel } from '../utils/logger.js';

/**
 * 默认配置值
 */
const defaultConfig: any = {
  // 基础配置
  DATA_DIR: path.join(process.cwd(), 'data'),
  BASE_URL: 'https://sepolia.namepump.com',

  // 区块链配置
  DEFAULT_CHAIN: 'base-sepolia',
  DEFAULT_CONTRACT_ADDRESS: '0xc5e5807294a071423a6aA413cEF9efb189B08Dbc',
  DEFAULT_RPC_URL: 'https://sepolia.base.org',
  
  // Bot平台配置
  TELEGRAM_TOKEN: '7750487882:AAEO33pbeDa0KTkIAzZ6EXrOGOGD6BfeHrY',
  LARK_APP_ID: undefined,
  LARK_APP_SECRET: undefined,
  
  // 日志配置
  LOG_LEVEL: LogLevel.ERROR,
  
  // Graph API配置
  GRAPH_URL: 'https://gateway.thegraph.com/api/subgraphs/id/F1FRqTazxbX29N6jDtquPu2HS5Fa7DVBqqCY4ESDD7ux',
  GRAPH_API_KEY: '4863dd4775057bb40128ff9de56c9322',
  
  // AI服务配置
  AI_TEXT_ENDPOINT: '/api/ai-agent/composer/compose',
  AI_IMAGE_ENDPOINT: '/api/ai-agent/composer/generateImage',
};

export default defaultConfig; 