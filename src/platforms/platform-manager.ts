/**
 * 平台管理器 - 管理所有平台实例
 */
import { ServiceContainer } from '../services/index.js';
import { CommandRouter } from '../commands/command-router.js';
import { Platform } from './platform-interface.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

export class PlatformManager {
  private platforms: Map<string, Platform> = new Map();
  private services: ServiceContainer;
  private commandRouter: CommandRouter;

  constructor(services: ServiceContainer, commandRouter: CommandRouter) {
    this.services = services;
    this.commandRouter = commandRouter;
  }

  /**
   * 注册平台
   */
  register(platform: Platform): void {
    this.platforms.set(platform.name, platform);
    logger.info(`已注册平台: ${platform.name}`);
  }

  /**
   * 初始化所有平台
   */
  async initAll(): Promise<void> {
    for (const [name, platform] of this.platforms.entries()) {
      try {
        await platform.init({
          services: this.services,
          commandRouter: this.commandRouter,
          config: config
        });
        logger.info(`平台初始化成功: ${name}`);
      } catch (error) {
        logger.error(`平台初始化失败: ${name}`, error);
      }
    }
  }

  /**
   * 启动平台
   */
  async start(name: string): Promise<boolean> {
    const platform = this.platforms.get(name);
    if (!platform) {
      logger.error(`平台不存在: ${name}`);
      return false;
    }

    if (!platform.start) {
      logger.warn(`平台不支持启动: ${name}`);
      return false;
    }

    try {
      await platform.start();
      logger.info(`平台启动成功: ${name}`);
      return true;
    } catch (error) {
      logger.error(`平台启动失败: ${name}`, error);
      return false;
    }
  }

  /**
   * 启动所有支持的平台
   */
  async startAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [name, platform] of this.platforms.entries()) {
      if (!!platform.start) {
        results.set(name, await this.start(name));
      }
    }
    
    return results;
  }

  /**
   * 获取平台
   */
  get(name: string): Platform | undefined {
    return this.platforms.get(name);
  }

  /**
   * 获取所有平台
   */
  getAll(): Platform[] {
    return Array.from(this.platforms.values());
  }
} 