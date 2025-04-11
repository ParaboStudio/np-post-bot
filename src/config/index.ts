/**
 * 配置加载器
 */
import { Config } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import defaultConfig from './default.js';

// 获取当前文件的URL并转换为文件路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件所在的目录
const __dirname = path.dirname(__filename);

/**
 * 应用版本号
 */
export const VERSION = '0.0.1';

/**
 * 获取数据目录，统一使用项目目录下的tmp文件夹
 */
export function getDataDirectory(): string {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.join(projectRoot, 'tmp', `parabo_v${VERSION.replace(/\./g, '_')}`);
}

/**
 * 加载配置文件
 */
function loadConfig(): Config {
  const configPath = path.join(__dirname, 'config.json');
  
  let configData: any = { ...defaultConfig };
  
  // 尝试加载自定义配置
  try {
    if (fs.existsSync(configPath)) {
      const configFileContent = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(configFileContent);
      // 合并配置，自定义配置优先
      configData = { ...configData, ...userConfig };
      console.log('已加载自定义配置文件');
    } else {
      console.log('未找到自定义配置文件，将使用默认配置');
    }
  } catch (error) {
    console.error('加载自定义配置文件失败:', error);
  }
  
  return configData;
}

/**
 * 构建应用配置
 */
const configData = loadConfig();

const config: Config = {
  // 基础配置
  DATA_DIR: getDataDirectory(),
  BASE_URL: configData.BASE_URL || 'http://localhost:3000',
  VERSION,
  
  // 区块链配置
  DEFAULT_CHAIN: configData.DEFAULT_CHAIN || 'ethereum',
  DEFAULT_CONTRACT_ADDRESS: configData.DEFAULT_CONTRACT_ADDRESS || '',
  DEFAULT_RPC_URL: configData.DEFAULT_RPC_URL || '',
  
  // Bot平台配置
  TELEGRAM_TOKEN: configData.TELEGRAM_TOKEN || '',
  LARK_APP_ID: configData.LARK_APP_ID,
  LARK_APP_SECRET: configData.LARK_APP_SECRET,
  
  // 日志配置
  LOG_LEVEL: configData.LOG_LEVEL || 'info',

  GRAPH_URL: configData.GRAPH_URL || '',
  GRAPH_API_KEY: configData.GRAPH_API_KEY || '',
  
  // AI服务配置
  AI_TEXT_ENDPOINT: configData.AI_TEXT_ENDPOINT || '',
  AI_IMAGE_ENDPOINT: configData.AI_IMAGE_ENDPOINT || '',
  
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
    console.warn('配置警告: 缺少BASE_URL，使用默认值');
  }
  
  // 检查关键配置
  if (!config.TELEGRAM_TOKEN) {
    console.warn('配置警告: 缺少TELEGRAM_TOKEN，Telegram平台可能无法正常工作');
  }
  
  // 输出临时目录警告
  console.warn(`⚠️ 警告: 使用临时存储 ${config.DATA_DIR}，数据可能在服务重启后丢失`);
}

// 验证配置
validateConfig(config);

export default config; 