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
 * 获取数据目录，不再使用版本号子目录
 */
export function getDataDirectory(): string {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.join(projectRoot, 'tmp');
}

/**
 * 获取用户特定的数据目录
 * @param userId 用户ID，如果是'admin'则返回管理员目录，否则返回用户特定目录
 */
export function getUserDataDirectory(userId: string): string {
  const baseDir = getDataDirectory();
  
  if (userId === 'admin') {
    return path.join(baseDir, 'admin');
  } else {
    return path.join(baseDir, 'users', userId);
  }
}

/**
 * 获取全局数据目录
 */
export function getGlobalDataDirectory(): string {
  return path.join(getDataDirectory(), 'global');
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
    // 创建基础数据目录
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
      console.log(`创建数据目录: ${this.DATA_DIR}`);
    }
    
    // 创建全局数据目录和子目录
    const globalDir = getGlobalDataDirectory();
    if (!fs.existsSync(globalDir)) {
      fs.mkdirSync(globalDir, { recursive: true });
      console.log(`创建全局数据目录: ${globalDir}`);
    }
    
    // 全局子目录
    const globalSubDirs = ['config', 'cache', 'images'];
    for (const dir of globalSubDirs) {
      const dirPath = path.join(globalDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`创建全局子目录: ${dirPath}`);
      }
    }
    
    // 创建管理员目录
    const adminDir = getUserDataDirectory('admin');
    if (!fs.existsSync(adminDir)) {
      fs.mkdirSync(adminDir, { recursive: true });
      console.log(`创建管理员目录: ${adminDir}`);
    }
    
    // 管理员子目录
    const adminSubDirs = ['wallets', 'images', 'scheduler', 'content'];
    for (const dir of adminSubDirs) {
      const dirPath = path.join(adminDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`创建管理员子目录: ${dirPath}`);
      }
    }
    
    // 创建用户基础目录
    const usersBaseDir = path.join(this.DATA_DIR, 'users');
    if (!fs.existsSync(usersBaseDir)) {
      fs.mkdirSync(usersBaseDir, { recursive: true });
      console.log(`创建用户基础目录: ${usersBaseDir}`);
    }
    
    // 如果有现有数据，尝试迁移
    tryMigrateOldData();
    
    // 输出临时目录警告
    console.warn('警告: 正在使用临时目录存储数据，服务器重启后数据可能会丢失!');
    console.warn(`临时目录路径: ${this.DATA_DIR}`);
  }
};

// 确保目录结构存在
config.ensureDirectories();

/**
 * 尝试迁移旧版本数据到新结构
 */
function tryMigrateOldData() {
  try {
    // 检查是否有旧版本的数据目录
    const projectRoot = path.resolve(__dirname, '../..');
    const oldVersionPattern = /parabo_v[0-9_]+$/;
    const tmpDir = path.join(projectRoot, 'tmp');
    
    if (!fs.existsSync(tmpDir)) {
      return;
    }
    
    // 列出tmp目录中的所有子目录
    const dirs = fs.readdirSync(tmpDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && oldVersionPattern.test(dirent.name))
      .map(dirent => dirent.name);
      
    if (dirs.length === 0) {
      return; // 没有找到旧版本目录
    }
    
    // 使用最新的版本目录进行迁移
    dirs.sort();
    const latestVersionDir = dirs[dirs.length - 1];
    const oldDataDir = path.join(tmpDir, latestVersionDir);
    console.log(`发现旧版数据目录: ${oldDataDir}，将尝试迁移数据...`);
    
    // 简单记录不进行实际迁移，避免在未经充分测试的情况下丢失数据
    console.warn('数据迁移功能待实现，请手动迁移或执行迁移脚本');
    
    // TODO: 实现数据迁移逻辑
    /* 
    1. 将用户数据从旧目录移至新的用户特定目录
    2. 将调度任务移至admin/scheduler目录
    3. 维护一个迁移日志，避免重复迁移
    */
  } catch (error) {
    console.error('尝试迁移旧数据时出错:', error);
  }
}

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

export default config; 
