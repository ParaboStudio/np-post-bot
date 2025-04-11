/**
 * Telegram消息处理器模块
 * 负责处理各种消息和命令
 */
import { logger } from '../../utils/logger.js';
import { Context } from 'telegraf';
import { TelegramCommandsMap } from './commands-map.js';
import { TelegramArgsParser } from './args-parser.js';
import { TelegramResultRenderer } from './result-renderer.js';
import { TelegramImageHelper } from './image-helper.js';
import { TelegramAuthorization } from './authorization.js';
import { CommandRouter } from '../../commands/command-router.js';
import { executeCommand } from '../platform-interface.js';
import { Config } from '../../types/index.js';
import { ServiceContainer } from '../../types/services.js';
import path from 'path';
import fs from 'fs';
import { getDataDirectory } from '../../config/index.js';
import { Update } from 'telegraf/typings/core/types/typegram';

// 定义检查消息是否有文本的辅助函数
function hasText(message: any): message is { text: string } {
  return message && typeof message.text === 'string';
}

/**
 * Telegram消息处理器
 */
export class TelegramMessageHandler {
  private commandsMap: TelegramCommandsMap;
  private argsParser: TelegramArgsParser;
  private resultRenderer: TelegramResultRenderer;
  private imageHelper: TelegramImageHelper;
  private authorization: TelegramAuthorization;
  
  private commandRouter: CommandRouter | null = null;
  private config: Config | null = null;
  private services: ServiceContainer | null = null;

  constructor(
    commandsMap: TelegramCommandsMap,
    argsParser: TelegramArgsParser,
    resultRenderer: TelegramResultRenderer,
    imageHelper: TelegramImageHelper,
    authorization: TelegramAuthorization
  ) {
    this.commandsMap = commandsMap;
    this.argsParser = argsParser;
    this.resultRenderer = resultRenderer;
    this.imageHelper = imageHelper;
    this.authorization = authorization;
    
    // 设置图像助手，以便结果渲染器可以处理图片
    this.resultRenderer.setImageHelper(imageHelper);
  }

  /**
   * 初始化消息处理器
   */
  public init(commandRouter: CommandRouter, config: Config, services: ServiceContainer) {
    this.commandRouter = commandRouter;
    this.config = config;
    this.services = services;
  }

  /**
   * 处理start命令
   */
  public async handleStartCommand(ctx: Context<Update>) {
    logger.debug('收到 /start 命令');

    // 检查用户是否在白名单中
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.authorization.checkAuthorization(telegramUserId);

    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
      logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
      return;
    }

    const result = await this.handleCommand('start', {}, this.authorization.createUserContext(ctx));
    await ctx.reply(result.success ? result.message : '欢迎使用社区发布机器人！输入 /help 获取命令列表。');
  }

  /**
   * 处理help命令
   */
  public async handleHelpCommand(ctx: Context<Update>) {
    logger.debug('收到 /help 命令');

    // 检查用户是否在白名单中
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.authorization.checkAuthorization(telegramUserId);

    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
      return;
    }

    const result = await this.handleCommand('help', {}, this.authorization.createUserContext(ctx));

    if (!result.success) {
      logger.warn('帮助命令执行失败，使用默认帮助信息');
      await ctx.reply(
        '可用命令:\n\n' +
        '基本命令:\n' +
        '/start - 开始使用机器人\n' +
        '/help - 显示此帮助信息\n' +
        '/info - 显示基本信息\n\n' +

        '内容管理:\n' +
        '/content_generate <社区> [提示词] - 生成内容\n' +
        '/content_list [社区] - 列出内容\n' +
        // '/content_add <社区> <文本> - 添加内容\n' +
        '/content_delete <内容ID> - 删除内容\n\n' +

        '发布管理:\n' +
        '/publish <社区> <内容ID> [钱包索引] - 发布内容\n' +
        '/quick_publish <社区> [文本] - 快速发布\n' +
        '/batch_publish <社区> <数量> - 批量发布内容\n\n' +

        '钱包管理:\n' +
        '/wallet_add <私钥> - 添加钱包\n' +
        '/wallet_generate [数量=20] - 自动生成HD钱包\n' +
        '/wallet_list - 列出钱包\n' +
        '/wallet_delete <索引> - 删除钱包\n' +
        '/wallet_switch <索引> - 切换当前钱包\n' +
        '/wallet_export [格式=json] - 导出钱包信息\n\n' +

        '资金管理:\n' +
        '/fund_send <接收地址> <金额> [钱包索引] - 从指定钱包向目标地址发送ETH\n' +
        '/fund_distribute <金额> <钱包列表> - 从当前钱包向多个钱包索引批量发送ETH\n' +
        '/fund_batch_eth <金额> <钱包列表> - 从当前钱包向指定地址或索引列表批量转账\n' +
        '/fund_balance [钱包索引] - 查询钱包余额\n\n' +

        '钱包资金操作:\n' +
        '/wallet_funding <私钥> <金额> - 使用外部钱包私钥向所有生成的钱包发送ETH ⚠️\n' +
        '/wallet_transfer_all <目标地址> - 将所有钱包的资金转移到安全地址，自动扣除gas费用(含足够安全余量)，每个钱包之间有1秒延迟\n' +
        '(⚠️ 注意：wallet_funding命令需要私钥参数，仅在私聊环境中使用，并注意保护私钥安全)\n\n' +

        '调度器:\n' +
        '/scheduler_status - 查看调度器状态\n' +
        '/scheduler_start - 启动调度器\n' +
        '/scheduler_stop - 停止调度器\n' +
        '/scheduler_update [参数] - 更新调度器配置\n\n' +
        
        '定时任务:\n' +
        '/schedule_add time=HH:MM community=社区 count=数量 interval=间隔 - 添加定时任务\n' +
        '/schedule_list - 列出所有定时任务\n' +
        '/schedule_delete <任务ID> - 删除定时任务\n' +
        '/schedule_enable <任务ID> - 启用定时任务\n' +
        '/schedule_disable <任务ID> - 禁用定时任务\n' +
        '/schedule_execute <任务ID> - 立即执行定时任务\n\n' +

        '多链操作:\n' +
        '/chain_switch <链名称> - 切换当前链\n' +
        '/chain_list - 列出支持的链\n' +
        '/chain_info - 显示当前链信息\n\n' +

        '系统:\n' +
        '/system_info - 显示系统信息\n' +
        '/system_diagnose - 运行系统诊断\n' +
        '/system_cache <操作> - 管理缓存\n' + 
        '/system_clear_images - 清理图片\n'
      );
    } else {
      await ctx.reply(result.message);
    }
  }

  /**
   * 处理info命令
   */
  public async handleInfoCommand(ctx: Context<Update>) {
    logger.debug('收到 /info 命令');

    // 检查用户是否在白名单中
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.authorization.checkAuthorization(telegramUserId);

    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
      logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
      return;
    }

    // 获取系统映射的用户ID
    const systemUserId = this.authorization.getMappedUserId(telegramUserId);

    // 获取用户信息
    const userInfo = {
      telegramId: telegramUserId,
      username: ctx.from?.username || 'Unknown',
      firstName: ctx.from?.first_name || '',
      lastName: ctx.from?.last_name || '',
      systemUser: systemUserId,
      isAuthorized: true,
      botVersion: this.config?.VERSION || '0.0.1',
      platform: 'telegram'
    };

    // 格式化显示
    const infoMessage = `
用户信息:
- Telegram ID: ${userInfo.telegramId}
- Telegram用户名: ${userInfo.username}
- 系统用户: ${userInfo.systemUser}
- 授权状态: ${userInfo.isAuthorized ? '已授权' : '未授权'}

机器人信息:
- 版本: ${userInfo.botVersion}
- 平台: ${userInfo.platform}
- 运行状态: 正常

系统时间: ${new Date().toLocaleString()}
    `.trim();

    await ctx.reply(infoMessage);

    // 如果需要，也可以路由到系统info命令获取更多信息
    try {
      const systemResult = await this.handleCommand('system.info', {}, this.authorization.createUserContext(ctx));
      if (systemResult.success && systemResult.data) {
        // 处理系统信息数据
        await this.resultRenderer.handleResultData(ctx, systemResult.data);
      }
    } catch (error) {
      logger.error('获取系统信息失败', error);
    }
  }

  /**
   * 处理文本消息（包括命令）
   */
  public async handleTextMessage(ctx: Context<Update>) {
    // 确保消息存在且含有文本内容
    if (!ctx.message || !hasText(ctx.message)) {
      logger.warn('收到无文本内容的消息');
      return;
    }

    const message = ctx.message.text;

    // 检查是否是命令（以/开头）
    if (message.startsWith('/')) {
      // 检查用户是否在白名单中
      const telegramUserId = ctx.from?.id.toString() || '';
      const isAuthorized = this.authorization.checkAuthorization(telegramUserId);

      if (!isAuthorized) {
        await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
        logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}, 命令: ${message}`);
        return;
      }

      const parts = message.split(' ');
      const commandWithSlash = parts[0];
      const args = parts.slice(1);
      let command = commandWithSlash.substring(1); // 移除/前缀

      logger.debug(`收到Telegram命令: /${command}, 参数: ${args.join(', ')}, 用户ID: ${telegramUserId}`);

      // 将Telegram命令映射到内部命令
      const mappedCommand = this.commandsMap.mapCommand(command);
      if (mappedCommand) {
        logger.debug(`映射到内部命令: ${mappedCommand}`);
        command = mappedCommand;
      } else {
        logger.warn(`未找到命令映射: ${command}`);
      }

      if (command) {
        // 针对特定命令进行参数处理
        const parsedArgs = this.argsParser.parseArgs(args, command);
        logger.debug(`解析参数: ${JSON.stringify(parsedArgs)}`);

        const result = await this.handleCommand(
          command,
          parsedArgs,
          this.authorization.createUserContext(ctx)
        );

        await ctx.reply(result.message);

        // 处理结果数据
        if (result.data) {
          await this.resultRenderer.handleResultData(ctx, result.data);
        }
      }
    }
  }

  /**
   * 处理内容详情命令
   */
  public async handleContentDetailCommand(ctx: Context<Update>) {
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.authorization.checkAuthorization(telegramUserId);
    
    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。');
      return;
    }
    
    // 确保消息存在且含有文本内容
    if (!ctx.message || !hasText(ctx.message)) {
      logger.warn('收到无文本内容的消息');
      return;
    }
    
    const message = ctx.message.text;
    const parts = message.split(' ');
    const args = parts.slice(1);
    
    // 解析参数
    let ensLabel = '';
    let index = -1;
    
    if (args.length > 0) {
      ensLabel = args[0];
      
      if (args.length > 1) {
        index = parseInt(args[1]);
        if (isNaN(index)) {
          await ctx.reply('索引必须是数字');
          return;
        }
        
        // 调整为0-based索引
        index = index - 1;
      }
    }
    
    if (!ensLabel) {
      await ctx.reply('请指定社区ENS标签');
      return;
    }
    
    try {
      // 先获取内容列表
      const userContext = this.authorization.createUserContext(ctx);
      const listResult = await this.handleCommand('content.list', { ensLabel }, userContext);
      
      if (!listResult.success || !listResult.data || !Array.isArray(listResult.data)) {
        await ctx.reply(`获取内容列表失败: ${listResult.message}`);
        return;
      }
      
      const contents = listResult.data;
      
      if (contents.length === 0) {
        await ctx.reply(`社区 "${ensLabel}" 没有内容`);
        return;
      }
      
      // 检查索引是否有效
      if (index < 0) {
        // 没有提供索引，显示可用的内容列表
        const contentList = contents.map((item: { id: any; text: string; }, i: number) => 
          `${i+1}. ID: ${item.id || '未知'} - ${item.text?.substring(0, 50)}...`
        ).join('\n');
        
        await ctx.reply(`社区 "${ensLabel}" 有 ${contents.length} 项内容:\n\n${contentList}\n\n请使用 /content_detail ${ensLabel} <序号> 查看完整内容`);
        return;
      }
      
      if (index >= contents.length) {
        await ctx.reply(`索引超出范围，最大索引为 ${contents.length}`);
        return;
      }
      
      // 获取指定的内容
      const content = contents[index];
      
      // 发送完整的内容详情
      const detailMessage = `
内容详情 (${index + 1}/${contents.length}):

ID: ${content.id || '未知'}
社区: ${content.ensLabel || ensLabel}
状态: ${content.status || 'draft'}
创建时间: ${content.createdAt ? new Date(content.createdAt).toLocaleString() : '未知'}

📝 内容:
${content.text || '无文本内容'}
      `.trim();
      
      await ctx.reply(detailMessage);
      
      // 如果有图片，也发送图片
      if (content.imagePath) {
        try {
          const resolvedPath = this.imageHelper.resolveImagePath(content.imagePath);
          
          if (resolvedPath) {
            await ctx.replyWithPhoto({ source: resolvedPath });
            logger.debug(`成功发送图片: ${resolvedPath}`);
          } else {
            // 如果没有找到图片，发送错误消息
            logger.error(`无法找到图片: ${content.imagePath}`);
            await ctx.reply(`无法找到与此内容关联的图片: ${path.basename(content.imagePath)}`);
          }
        } catch (error) {
          logger.error(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
          await ctx.reply(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
      
      // 添加导航按钮消息
      if (contents.length > 1) {
        let navMessage = '导航:';
        if (index > 0) {
          navMessage += ` /content_detail ${ensLabel} ${index} (上一条)`;
        }
        
        if (index < contents.length - 1) {
          navMessage += ` /content_detail ${ensLabel} ${index + 2} (下一条)`;
        }
        
        await ctx.reply(navMessage);
      }
    } catch (error) {
      logger.error('获取内容详情失败', error);
      await ctx.reply(`获取内容详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理清理图片命令
   */
  public async handleClearImagesCommand(ctx: Context<Update>) {
    logger.debug('收到 /system_clear_images 命令');

    // 检查用户是否在白名单中
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.authorization.checkAuthorization(telegramUserId);

    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
      logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
      return;
    }

    // 确保消息存在且含有文本内容
    if (!ctx.message || !hasText(ctx.message)) {
      logger.warn('收到无文本内容的消息');
      return;
    }

    const args = ctx.message.text.split(' ');
    
    // 获取命名模式参数（如果有）
    const pattern = args.length > 1 ? args[1] : '';
    
    // 显示正在处理的消息
    let processingMsg;
    if (pattern) {
      processingMsg = await ctx.reply(`正在清理名称包含 "${pattern}" 的图片文件，请稍候...`);
    } else {
      processingMsg = await ctx.reply(`正在清理所有图片文件，请稍候...`);
    }
    
    try {
      // 获取数据目录
      const dataDir = this.config?.DATA_DIR || getDataDirectory();
      const imagesDir = path.join(dataDir, 'images');
      
      // 检查目录是否存在
      if (!fs.existsSync(imagesDir)) {
        await ctx.reply(`图片目录不存在: ${imagesDir}`);
        return;
      }
      
      // 执行清理并获取结果
      const result = await this.imageHelper.cleanupImages(imagesDir, pattern);
      
      // 构建清理说明
      const description = pattern ? `名称包含 "${pattern}" 的图片文件` : '所有图片文件';
      
      // 发送清理结果
      const message = `
图片清理完成!

清理内容: ${description}
已删除: ${result.count}个文件
释放空间: ${this.imageHelper.formatBytes(result.size)}
      `.trim();
      
      // 确保chat存在
      if (ctx.chat) {
        await ctx.telegram.editMessageText(
          ctx.chat.id, 
          processingMsg.message_id, 
          undefined, 
          message
        );
      } else {
        // 如果chat不存在，使用reply替代
        await ctx.reply(message);
      }
    } catch (error) {
      logger.error('清理图片失败', error);
      await ctx.reply(`清理图片时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理命令
   */
  private async handleCommand(command: string, args: Record<string, any>, userContext: any) {
    if (!this.commandRouter) {
      return {
        success: false,
        message: '命令路由器未初始化'
      };
    }

    logger.debug(`尝试路由命令: ${command}, 参数: ${JSON.stringify(args)}`);

    try {
      // 特殊处理敏感命令
      if (command === 'wallet.add' && args.privateKey) {
        logger.debug('处理添加钱包命令 (私钥已隐藏)');
      }
      
      // 特殊处理内容列表+详情命令
      if (command === 'content.list' && (args.index !== undefined || args.id !== undefined)) {
        return await this.handleContentDetailRequest(args, userContext);
      }

      // 尝试直接路由命令
      return await executeCommand(this.commandRouter, command, args, userContext);
    } catch (error) {
      logger.error(`命令执行失败: ${command}`, error);
      return {
        success: false,
        message: `命令执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
  
  /**
   * 处理内容详情请求
   */
  private async handleContentDetailRequest(args: Record<string, any>, userContext: any): Promise<any> {
    try {
      const { ensLabel, index, id } = args;
      
      if (!ensLabel) {
        return {
          success: false,
          message: '请指定社区ENS标签'
        };
      }
      
      // 获取内容列表
      const listResult = await executeCommand(this.commandRouter!, 'content.list', { ensLabel }, userContext);
      
      if (!listResult.success || !listResult.data || !Array.isArray(listResult.data)) {
        return {
          success: false,
          message: `获取内容列表失败: ${listResult.message}`
        };
      }
      
      const contents = listResult.data;
      
      if (contents.length === 0) {
        return {
          success: false,
          message: `社区 "${ensLabel}" 没有内容`
        };
      }
      
      // 如果没有指定索引或ID，直接返回列表结果
      if (index === undefined && id === undefined) {
        return listResult;
      }
      
      // 通过索引或ID查找指定内容
      let targetContent = null;
      let targetIndex = -1;
      
      if (index !== undefined) {
        // 用户提供的索引是从1开始的，需要转换为0-based索引
        const adjustedIndex = index - 1;
        
        if (adjustedIndex < 0 || adjustedIndex >= contents.length) {
          return {
            success: false,
            message: `索引超出范围，有效范围为 1-${contents.length}`
          };
        }
        
        targetContent = contents[adjustedIndex];
        targetIndex = adjustedIndex;
      } else if (id !== undefined) {
        // 通过ID查找
        targetIndex = contents.findIndex(item => item.id === id);
        
        if (targetIndex === -1) {
          return {
            success: false,
            message: `找不到ID为 "${id}" 的内容`
          };
        }
        
        targetContent = contents[targetIndex];
      }
      
      // 构建详情消息
      return {
        success: true,
        message: `内容详情 (${targetIndex + 1}/${contents.length}):\n\nID: ${targetContent.id || '未知'}\n社区: ${targetContent.ensLabel || ensLabel}\n状态: ${targetContent.status || 'draft'}\n创建时间: ${targetContent.createdAt ? new Date(targetContent.createdAt).toLocaleString() : '未知'}\n\n📝 内容:\n${targetContent.text || '无文本内容'}`,
        data: {
          ...targetContent,
          isDetail: true,
          totalItems: contents.length,
          currentIndex: targetIndex,
          // 添加导航信息
          navigation: {
            hasNext: targetIndex < contents.length - 1,
            hasPrevious: targetIndex > 0,
            nextCommand: targetIndex < contents.length - 1 ? `/content_list ${ensLabel} ${targetIndex + 2}` : null,
            prevCommand: targetIndex > 0 ? `/content_list ${ensLabel} ${targetIndex}` : null
          }
        }
      };
    } catch (error) {
      logger.error('获取内容详情失败', error);
      return {
        success: false,
        message: `获取内容详情失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
} 