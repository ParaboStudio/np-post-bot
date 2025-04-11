/**
 * Telegram平台实现
 * 负责与Telegram API交互，处理消息和命令
 */
import { Platform, PlatformInitOptions } from '../platform-interface.js';
import { CommandRouter } from '../../commands/command-router.js';
import { ServiceContainer } from '../../services/index.js';
import { TelegramCommandsMap } from './commands-map.js';
import { logger } from '../../utils/logger.js';
import { Telegraf } from 'telegraf';
import { TelegramMessageHandler } from './message-handler.js';
import { TelegramArgsParser } from './args-parser.js';
import { TelegramResultRenderer } from './result-renderer.js';
import { TelegramImageHelper } from './image-helper.js';
import { TelegramAuthorization } from './authorization.js';
import { Config } from '../../types/index.js';

/**
 * Telegram平台实现
 */
export class TelegramPlatform implements Platform {
  id: string = 'telegram';
  name: string = 'telegram';
  
  private services!: ServiceContainer;
  private commandRouter!: CommandRouter;
  private commandsMap: TelegramCommandsMap;
  private config!: Config;
  private bot: Telegraf | null = null;
  private messageHandler: TelegramMessageHandler | null = null;
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
    this.config = options.config;
    
    // 检查是否有有效的Telegram令牌
    if (!this.config.TELEGRAM_TOKEN) {
      logger.error('Telegram平台初始化失败: 缺少Telegram令牌');
      return false;
    }
    
    // 初始化Telegram消息处理相关类
    const argsParser = new TelegramArgsParser();
    const resultRenderer = new TelegramResultRenderer();
    const imageHelper = new TelegramImageHelper();
    const authorization = new TelegramAuthorization();
    
    // 创建消息处理器
    this.messageHandler = new TelegramMessageHandler(
      this.commandsMap,
      argsParser,
      resultRenderer,
      imageHelper,
      authorization
    );
    
    // 初始化消息处理器
    this.messageHandler.init(this.commandRouter, this.config, this.services);
    
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
    
    // 确保有Telegram令牌
    const token = this.config.TELEGRAM_TOKEN;
    if (!token) {
      logger.error('Telegram平台启动失败: 缺少Telegram令牌');
      return false;
    }
    
    try {
      // 创建Telegraf实例
      this.bot = new Telegraf(token);
      
      // 注册消息处理器
      if (this.messageHandler) {
        // 注册启动命令
        this.bot.command('start', (ctx) => this.messageHandler!.handleStartCommand(ctx));
        
        // 注册帮助命令
        this.bot.command('help', (ctx) => this.messageHandler!.handleHelpCommand(ctx));
        
        // 注册其他命令
        this.bot.command('info', (ctx) => this.messageHandler!.handleInfoCommand(ctx));
        
        // 注册文本消息处理（包括其他命令）
        this.bot.on('text', (ctx) => this.messageHandler!.handleTextMessage(ctx));
      }
      
      // 启动bot
      await this.bot.launch();
      
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
    if (!this.initialized || !this.bot) {
      return true;
    }
    
    try {
      // 停止Telegraf实例
      await this.bot.stop();
      
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