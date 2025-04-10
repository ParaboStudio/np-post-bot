/**
 * 内容命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import logger from '../utils/logger.js';

/**
 * 内容命令模块
 */
export class ContentCommands implements CommandModule {
  public name = 'content';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('content.generate', this.generateContent);
    router.registerHandler('content.add', this.addContent);
    router.registerHandler('content.list', this.listContents);
    router.registerHandler('content.delete', this.deleteContent);
  }

  /**
   * 生成内容
   */
  private generateContent: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.ensLabel) {
        return {
          success: false,
          message: '缺少社区ENS标签参数'
        };
      }

      // 生成内容
      const postingService = services.posting;
      const content = await postingService.generateContent(
        args.ensLabel,
        args.prompt,
        context.userId
      );

      return {
        success: true,
        message: '内容生成成功',
        data: content
      };
    } catch (error) {
      logger.error('生成内容失败', error);
      return {
        success: false,
        message: `生成内容失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 添加内容
   */
  private addContent: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.ensLabel) {
        return {
          success: false,
          message: '缺少社区ENS标签参数'
        };
      }

      if (!args.text) {
        return {
          success: false,
          message: '缺少文本内容参数'
        };
      }

      const storageService = services.storage;
      const aiService = services.ai;
      
      // 生成图片
      const image = await aiService.generateImage(args.text);
      
      // 保存内容
      const content = await storageService.addContent(context.userId, {
        ensLabel: args.ensLabel,
        text: args.text,
        imageUrl: image.url,
        imageCid: '',
        status: 'draft',
        createdAt: new Date()
      });

      return {
        success: true,
        message: '内容添加成功',
        data: content
      };
    } catch (error) {
      logger.error('添加内容失败', error);
      return {
        success: false,
        message: `添加内容失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 列出内容
   */
  private listContents: CommandHandler = async ({ services, args, context }) => {
    try {
      const storageService = services.storage;
      const contents = storageService.getContents(context.userId, args.ensLabel);

      return {
        success: true,
        message: '获取内容列表成功',
        data: contents
      };
    } catch (error) {
      logger.error('获取内容列表失败', error);
      return {
        success: false,
        message: `获取内容列表失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 删除内容
   */
  private deleteContent: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.id) {
        return {
          success: false,
          message: '缺少内容ID参数'
        };
      }

      const storageService = services.storage;
      const success = await storageService.deleteContent(context.userId, args.id);

      return {
        success,
        message: success ? '内容删除成功' : '内容删除失败'
      };
    } catch (error) {
      logger.error('删除内容失败', error);
      return {
        success: false,
        message: `删除内容失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 