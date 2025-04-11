/**
 * Telegram平台实现
 * 负责与Telegram API交互，处理消息和命令
 */
import { Platform, PlatformInitOptions } from '../platform-interface.js';
import { CommandRouter } from '../../commands/command-router.js';
import { ServiceContainer } from '../../services/index.js';
import { TelegramCommandsMap } from './commands-map.js';
import { logger } from '../../utils/logger.js';

/**
 * Telegram平台实现
 */
export class TelegramPlatform implements Platform {
  id: string = 'telegram';
  name: string = 'Telegram';
  
  private services!: ServiceContainer;
  private commandRouter!: CommandRouter;
  private commandsMap: TelegramCommandsMap;
  private initialized: boolean = false;
  
  /**
   * 构造函数
   */
  constructor() {
    this.commandsMap = new TelegramCommandsMap();
  }
  
  /**
   * 初始化平台
   */
  async init(options?: PlatformInitOptions): Promise<boolean> {
    if (!options) {
      logger.error('Telegram平台初始化失败: 缺少必要的初始化参数');
      return false;
    }
    
    this.services = options.services;
    this.commandRouter = options.commandRouter;
    
    // 记录初始化成功
    this.initialized = true;
    logger.info('Telegram平台已初始化');
    return true;
  }
  
  /**
   * 启动平台
   */
  async start(): Promise<boolean> {
    if (!this.initialized) {
      logger.error('Telegram平台启动失败: 平台未初始化');
      return false;
    }
    
    try {
      // 这里实现Telegram Bot启动逻辑
      // 实际项目中应该包含与Telegram API的连接和消息处理
      logger.info('Telegram平台已启动');
      return true;
    } catch (error) {
      logger.error('Telegram平台启动失败', error);
      return false;
    }
  }
  
  /**
   * 停止平台
   */
  async stop(): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }
    
    try {
      // 这里实现Telegram Bot停止逻辑
      logger.info('Telegram平台已停止');
      return true;
    } catch (error) {
      logger.error('Telegram平台停止失败', error);
      return false;
    }
  }
  
  /**
   * 获取平台信息
   */
  getInfo(): Record<string, any> {
    return {
      name: this.name,
      id: this.id,
      initialized: this.initialized,
      commandCount: this.commandsMap ? this.commandsMap.getAvailableCommands().length : 0
    };
  }
} 