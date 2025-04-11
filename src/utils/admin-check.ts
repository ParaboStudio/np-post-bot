import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const configPath = path.join(process.cwd(), 'config', 'admin-whitelist.json');

// 默认只包含'admin'用户
const defaultAdminIds = ['admin'];

// 管理员白名单
let adminWhitelist: string[] = [];

// 加载管理员白名单
function loadAdminWhitelist(): void {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      adminWhitelist = JSON.parse(content);
      logger.info('已加载管理员白名单配置');
    } else {
      // 创建默认配置，只包含admin
      adminWhitelist = defaultAdminIds;
      // 确保config目录存在
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(defaultAdminIds, null, 2));
      logger.info('已创建默认管理员白名单配置');
    }
  } catch (error) {
    logger.error('加载管理员白名单失败，使用默认配置', error);
    adminWhitelist = defaultAdminIds;
  }
}

// 初始加载
loadAdminWhitelist();

/**
 * 检查用户ID是否是管理员
 */
export function isAdmin(userId: string): boolean {
  return userId === 'admin' || adminWhitelist.includes(userId);
}

/**
 * 检查Telegram ID是否是管理员
 */
export function isTelegramAdmin(telegramId: string): boolean {
  return adminWhitelist.includes(`tg:${telegramId}`);
}

/**
 * 获取Telegram ID对应的用户ID
 * 如果是管理员，统一返回'admin'
 */
export function getTelegramUserId(telegramId: string): string {
  return isTelegramAdmin(telegramId) ? 'admin' : '';
}

export default {
  isAdmin,
  isTelegramAdmin,
  getTelegramUserId
}; 