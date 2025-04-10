/**
 * 配置加载器
 */
import * as dotenv from 'dotenv';
import { Config } from '../types/index.js';
import defaultConfig from './default.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


// 获取当前文件的URL并转换为文件路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件所在的目录
const __dirname = path.dirname(__filename);

/**
 * 应用版本号
 */
export const VERSION = '0.0.1';

// 加载.env文件
dotenv.config();

/**
 * 获取数据目录，统一使用/tmp
 */
export function getDataDirectory(): string {
  // if (process.env.NODE_ENV === 'production') {
    // 生产环境使用系统临时目录
    // return path.join('/tmp', `parabo_v${VERSION.replace(/\./g, '_')}`);
  // } else {
    // 开发环境使用项目目录
    const projectRoot = path.resolve(__dirname, '../..');
    return path.join(projectRoot, 'tmp', `parabo_v${VERSION.replace(/\./g, '_')}`);
  // }
}

/**
 * 构建应用配置
 */
const config: Config = {
  // 基础配置
  DATA_DIR: getDataDirectory(),
  BASE_URL: process.env.BASE_URL || defaultConfig.BASE_URL,
  VERSION,
  
  // 区块链配置
  DEFAULT_CHAIN: process.env.DEFAULT_CHAIN || defaultConfig.DEFAULT_CHAIN,
  DEFAULT_CONTRACT_ADDRESS: process.env.DEFAULT_CONTRACT_ADDRESS || defaultConfig.DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_RPC_URL: process.env.DEFAULT_RPC_URL || defaultConfig.DEFAULT_RPC_URL,
  
  // Bot平台配置
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || defaultConfig.TELEGRAM_TOKEN,
  LARK_APP_ID: process.env.LARK_APP_ID,
  LARK_APP_SECRET: process.env.LARK_APP_SECRET,
  
  // 日志配置
  LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig.LOG_LEVEL,

  GRAPH_URL: process.env.GRAPH_URL || defaultConfig.GRAPH_URL,
  GRAPH_API_KEY: process.env.GRAPH_API_KEY || defaultConfig.GRAPH_API_KEY,
  
  // AI服务配置
  AI_TEXT_ENDPOINT: process.env.AI_TEXT_ENDPOINT || defaultConfig.AI_TEXT_ENDPOINT,
  AI_IMAGE_ENDPOINT: process.env.AI_IMAGE_ENDPOINT || defaultConfig.AI_IMAGE_ENDPOINT,
  
  // 确保目录存在
  ensureDirectories() {
    // 创建主数据目录
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
      console.log(`创建数据目录: ${this.DATA_DIR}`);
    }
    
    // 创建必要的子目录
    const subDirs = ['users', 'images', 'metadata'];
    for (const dir of subDirs) {
      const dirPath = path.join(this.DATA_DIR, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`创建子目录: ${dirPath}`);
      }
    }
    
    // 输出临时目录警告
    console.warn('警告: 正在使用临时目录存储数据，服务器重启后数据可能会丢失!');
    console.warn(`临时目录路径: ${this.DATA_DIR}`);
  }
};

// 确保目录结构存在
config.ensureDirectories();

/**
 * 验证配置是否有效
 */
function validateConfig(config: Config): void {
  // 验证基础配置
  if (!config.BASE_URL) {
    throw new Error('配置错误: 缺少BASE_URL');
  }
  
  // 创建数据目录
  if (config.DATA_DIR) {
    try {
      if (!fs.existsSync(config.DATA_DIR)) {
        fs.mkdirSync(config.DATA_DIR, { recursive: true });
      }
      
      // 创建子目录
      const subdirs = ['users', 'images', 'metadata'];
      for (const dir of subdirs) {
        const fullPath = path.join(config.DATA_DIR, dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      }
    } catch (error) {
      console.error(`无法创建数据目录: ${config.DATA_DIR}`, error);
    }
  }
  
  // 输出临时目录警告
  console.warn(`⚠️ 警告: 使用临时存储 ${config.DATA_DIR}，数据可能在服务重启后丢失`);
}

// 验证配置
validateConfig(config);

export default config; 