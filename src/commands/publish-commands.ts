/**
 * 发布命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import logger from '../utils/logger.js';

/**
 * 发布命令模块
 */
export class PublishCommands implements CommandModule {
  public name = 'publish';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('publish.content', this.publishContent);
    router.registerHandler('publish.quick', this.quickPublish);
  }

  /**
   * 发布内容
   */
  private publishContent: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.ensLabel) {
        return {
          success: false,
          message: '缺少社区ENS标签参数'
        };
      }

      if (!args.contentId) {
        return {
          success: false,
          message: '缺少内容ID参数'
        };
      }

      // 发布内容
      const postingService = services.posting;
      const result = await postingService.publishContent(
        args.ensLabel,
        args.contentId,
        args.walletIndex,
        context.userId
      );

      return {
        success: true,
        message: '内容发布成功',
        data: result
      };
    } catch (error) {
      logger.error('发布内容失败', error);
      return {
        success: false,
        message: `发布内容失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 快速发布
   */
  private quickPublish: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.ensLabel) {
        return {
          success: false,
          message: '缺少社区ENS标签参数'
        };
      }

      // 快速发布
      const postingService = services.posting;
      const result = await postingService.quickPublish(
        args.ensLabel,
        args.text,
        args.walletIndex,
        context.userId
      );

      return {
        success: true,
        message: '快速发布成功',
        data: result
      };
    } catch (error) {
      logger.error('快速发布失败', error);
      return {
        success: false,
        message: `快速发布失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 