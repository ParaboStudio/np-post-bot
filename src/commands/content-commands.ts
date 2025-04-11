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
    router.registerHandler('content.publish', this.publishContent);
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

  /**
   * 发布内容
   * 支持从缓存列表中选择内容发布，如果缓存中没有可用内容则生成新内容
   */
  private publishContent: CommandHandler = async ({ services, args, context }) => {
    try {
      if (!args.community) {
        return {
          success: false,
          message: '缺少社区参数'
        };
      }
      
      const ensLabel = args.community;
      const useCache = args.useCache === true;
      
      logger.info(`发布内容到社区 ${ensLabel}，使用缓存: ${useCache ? '是' : '否'}`);
      
      // 获取服务
      const postingService = services.posting;
      const storageService = services.storage;
      
      // 如果使用缓存，先尝试从缓存获取未发布的内容
      if (useCache) {
        // 获取该社区的所有内容
        const contents = storageService.getContents(context.userId, ensLabel);
        
        // 筛选出状态为'draft'的内容
        const draftContents = contents.filter(content => 
          content.status === 'draft'
        );
        
        if (draftContents.length > 0) {
          // 按创建时间排序，优先使用最早创建的
          draftContents.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          const contentToPublish = draftContents[0];
          logger.info(`从缓存中找到可用内容: ${contentToPublish.id}`);
          
          // 使用现有内容发布
          const result = await postingService.publishContent(
            ensLabel,
            contentToPublish.id,
            args.walletIndex,
            context.userId
          );
          
          return {
            success: true,
            message: `使用缓存内容发布成功，内容ID: ${contentToPublish.id}`,
            data: {
              ...result,
              contentId: contentToPublish.id,
              fromCache: true
            }
          };
        } else {
          logger.info(`缓存中没有找到可用内容，将生成新内容`);
        }
      }
      
      // 没有缓存或缓存中没有可用内容，生成新内容并发布
      const result = await postingService.quickPublish(
        ensLabel,
        '', // 不指定文本，由AI生成
        args.walletIndex,
        context.userId
      );
      
      return {
        success: true,
        message: '内容生成并发布成功',
        data: {
          ...result,
          fromCache: false
        }
      };
    } catch (error) {
      logger.error('内容发布失败', error);
      return {
        success: false,
        message: `内容发布失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 