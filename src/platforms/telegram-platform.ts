/**
 * Telegram平台实现
 * 需要安装依赖: npm install telegraf
 */
import { Telegraf, Context } from 'telegraf';
import { logger } from '../utils/logger.js';
import { Platform, PlatformInitOptions, executeCommand } from './platform-interface.js';
import { ServiceContainer } from '../types/services.js';
import { CommandRouter } from '../commands/command-router.js';
import { Config } from '../types/index.js';
import path from 'path';
import fs, { PathLike } from 'fs';
import { getDataDirectory } from '../config/index.js';

/**
 * Telegram平台实现
 */
export class TelegramPlatform implements Platform {
  name = 'telegram';
  private bot: Telegraf | null = null;
  private services: ServiceContainer | null = null;
  private commandRouter: CommandRouter | null = null;
  private config: Config | null = null;
  private isRunning: boolean = false;

  // Telegram用户ID白名单 - 将Telegram用户ID映射到系统用户
  private authorizedUsers: Record<string, string> = {
    // 您的Telegram ID映射到admin用户
    '1424003064': 'admin',
    '6157223080': 'admin',

    // 可以添加更多授权用户
    // '其他TelegramID': 'admin',
    // '另一个TelegramID': '其他系统用户名'
  };

  // 命令映射表 - 将Telegram命令映射到内部命令
  private commandMap: Record<string, string> = {
    // 基本命令
    'start': 'start',
    'help': 'help',
    'info': 'info',

    // 内容相关命令
    'generate': 'content.generate',
    'list': 'content.list',
    'content_generate': 'content.generate',
    'content_list': 'content.list',
    'content_add': 'content.add',
    'content_delete': 'content.delete',
    'content_detail': 'content.detail',
    'content_list_detail': 'content.detail',

    // 发布相关命令
    'publish': 'publish.content',
    'quick_publish': 'publish.quick',

    // 钱包相关命令
    'wallet_add': 'wallet.add',
    'wallet_list': 'wallet.list',
    'wallet_delete': 'wallet.delete',
    'wallet_switch': 'wallet.switch',

    // 用户相关命令
    'user_add': 'user.add',
    'user_list': 'user.list',
    'user_delete': 'user.delete',
    'user_switch': 'user.switch',

    // 调度器相关命令
    'scheduler_status': 'scheduler.status',
    'scheduler_start': 'scheduler.start',
    'scheduler_stop': 'scheduler.stop',
    'scheduler_config': 'scheduler.config',
    'scheduler_update': 'scheduler.update',

    // 系统相关命令
    'system_info': 'system.info',
    'system_diagnose': 'system.diagnose',
    'system_cache': 'system.cache',
    'system_version': 'system.version',
    'system_clear_images': 'system.clear_images'
  };

  async init(options?: PlatformInitOptions): Promise<boolean> {
    if (!options) {
      logger.error('初始化Telegram平台失败: 未提供初始化选项');
      return false;
    }

    try {
      const { services, commandRouter, config } = options;
      this.services = services;
      this.commandRouter = commandRouter;
      this.config = config;

      // 检查Telegram令牌是否配置
      if (!config.TELEGRAM_TOKEN) {
        logger.error('初始化Telegram平台失败: 未配置TELEGRAM_BOT_TOKEN');
        return false;
      }

      // 创建Telegram机器人实例
      this.bot = new Telegraf(config.TELEGRAM_TOKEN);

      // 设置命令处理
      this.setupCommandHandlers();

      logger.info('Telegram平台初始化成功');

      // 打印可用命令列表
      if (this.commandRouter) {
        const commands = this.commandRouter.getCommands();
        logger.info(`可用命令: ${commands.join(', ')}`);
      }

      return true;
    } catch (error) {
      logger.error(`初始化Telegram平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  private setupCommandHandlers() {
    if (!this.bot || !this.commandRouter) return;

    // 设置开始命令
    this.bot.start(async (ctx) => {
      logger.debug('收到 /start 命令');

      // 检查用户是否在白名单中
      const telegramUserId = ctx.from?.id.toString() || '';
      const isAuthorized = this.checkAuthorization(telegramUserId);

      if (!isAuthorized) {
        await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
        logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
        return;
      }

      const result = await this.handleCommand('start', {}, this.createUserContext(ctx));
      await ctx.reply(result.success ? result.message : '欢迎使用社区发布机器人！输入 /help 获取命令列表。');
    });

    // 设置帮助命令
    this.bot.help(async (ctx) => {
      logger.debug('收到 /help 命令');

      // 检查用户是否在白名单中
      const telegramUserId = ctx.from?.id.toString() || '';
      const isAuthorized = this.checkAuthorization(telegramUserId);

      if (!isAuthorized) {
        await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
        return;
      }

      const result = await this.handleCommand('help', {}, this.createUserContext(ctx));

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
          '/quick_publish <社区> [文本] - 快速发布\n\n' +

          '钱包管理:\n' +
          '/wallet_add <私钥> - 添加钱包\n' +
          '/wallet_list - 列出钱包\n' +
          '/wallet_delete <索引> - 删除钱包\n' +
          '/wallet_switch <索引> - 切换钱包\n\n' +

          '调度器:\n' +
          '/scheduler_status - 查看调度器状态\n' +
          '/scheduler_start - 启动调度器\n' +
          '/scheduler_stop - 停止调度器\n' +
          '/scheduler_update [参数] - 更新调度器配置\n\n' +

          '系统:\n' +
          '/system_info - 显示系统信息\n' +
          '/system_diagnose - 运行系统诊断\n' +
          '/system_cache <操作> - 管理缓存\n' + 
          '/system_clear_images - 清理图片\n'
        );
      } else {
        await ctx.reply(result.message);
      }
    });

    // 设置info命令
    this.bot.command('info', async (ctx) => {
      logger.debug('收到 /info 命令');

      // 检查用户是否在白名单中
      const telegramUserId = ctx.from?.id.toString() || '';
      const isAuthorized = this.checkAuthorization(telegramUserId);

      if (!isAuthorized) {
        await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
        logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
        return;
      }

      // 获取系统映射的用户ID
      const systemUserId = this.getMappedUserId(telegramUserId);

      // 获取用户信息
      const userInfo = {
        telegramId: telegramUserId,
        username: ctx.from?.username || 'Unknown',
        firstName: ctx.from?.first_name || '',
        lastName: ctx.from?.last_name || '',
        systemUser: systemUserId,
        isAuthorized: true,
        botVersion: this.config?.VERSION || '0.0.1',
        platform: this.name
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
        const systemResult = await this.handleCommand('system.info', {}, this.createUserContext(ctx));
        if (systemResult.success && systemResult.data) {
          // 处理系统信息数据
          this.handleResultData(ctx, systemResult.data);
        }
      } catch (error) {
        logger.error('获取系统信息失败', error);
      }
    });

    // 处理所有其他命令和文本消息
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;

      // 检查是否是命令（以/开头）
      if (message.startsWith('/')) {
        // 检查用户是否在白名单中
        const telegramUserId = ctx.from?.id.toString() || '';
        const isAuthorized = this.checkAuthorization(telegramUserId);

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
        const mappedCommand = this.commandMap[command];
        if (mappedCommand) {
          logger.debug(`映射到内部命令: ${mappedCommand}`);
          command = mappedCommand;
        } else {
          logger.warn(`未找到命令映射: ${command}`);
        }

        if (command) {
          // 针对特定命令进行参数处理
          const parsedArgs = this.parseArgs(args, command);
          logger.debug(`解析参数: ${JSON.stringify(parsedArgs)}`);

          const result = await this.handleCommand(
            command,
            parsedArgs,
            this.createUserContext(ctx)
          );

          await ctx.reply(result.message);

          // 处理结果数据
          if (result.data) {
            this.handleResultData(ctx, result.data);
          }
        }
      }
    });

    // 处理错误
    this.bot.catch((error) => {
      logger.error(`Telegram bot error: ${error instanceof Error ? error.message : '未知错误'}`);
    });

    // 添加内容详情命令处理
    this.bot.command('content_detail', async (ctx) => {
      await this.handleContentDetailCommand(ctx);
    });

    // 别名
    this.bot.command('content_list_detail', async (ctx) => {
      await this.handleContentDetailCommand(ctx);
    });

    // 设置清理图片命令
    this.bot.command('system_clear_images', async (ctx) => {
      logger.debug('收到 /system_clear_images 命令');

      // 检查用户是否在白名单中
      const telegramUserId = ctx.from?.id.toString() || '';
      const isAuthorized = this.checkAuthorization(telegramUserId);

      if (!isAuthorized) {
        await ctx.reply('您没有使用此机器人的权限。请联系管理员添加您的ID到白名单。');
        logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
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
        const result = await this.cleanupImages(imagesDir, pattern);
        
        // 构建清理说明
        const description = pattern ? `名称包含 "${pattern}" 的图片文件` : '所有图片文件';
        
        // 发送清理结果
        const message = `
图片清理完成!

清理内容: ${description}
已删除: ${result.count}个文件
释放空间: ${this.formatBytes(result.size)}
        `.trim();
        
        await ctx.telegram.editMessageText(
          ctx.chat.id, 
          processingMsg.message_id, 
          undefined, 
          message
        );
      } catch (error) {
        logger.error('清理图片失败', error);
        await ctx.reply(`清理图片时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  }

  /**
   * 检查用户是否在授权白名单中
   */
  private checkAuthorization(telegramUserId: string): boolean {
    // 检查用户ID是否在白名单中
    return telegramUserId in this.authorizedUsers;
  }

  /**
   * 获取映射的系统用户ID
   */
  private getMappedUserId(telegramUserId: string): string {
    // 如果用户在白名单中，返回映射的系统用户ID，否则返回'admin'作为默认值
    return this.authorizedUsers[telegramUserId] || 'admin';
  }

  /**
  * 解析图片文件的完整路径
  */
  private resolveImagePath(imagePath: string): string | null {
    // 记录原始路径以便调试
    logger.debug(`尝试解析图片路径: ${imagePath}`);

    // 如果是绝对路径且文件存在，直接返回
    if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) {
      logger.debug(`图片是有效的绝对路径`);
      return imagePath;
    }

    // 获取数据目录 - 使用配置中已有的函数
    const dataDir = this.config?.DATA_DIR || getDataDirectory();

    // 提取图片文件名
    const imageName = path.basename(imagePath);
    logger.debug(`图片文件名: ${imageName}, 数据目录: ${dataDir}`);

    // 定义可能的路径
    const possibleLocations = [
      // 1. 直接使用原始路径
      imagePath,

      // 2. 相对于数据目录的 images 子目录
      path.join(dataDir, 'images', imageName),

      // 3. 如果原始路径中已经包含 images/，则尝试以数据目录为基础
      imagePath.includes('images/')
        ? path.join(dataDir, imagePath)
        : null,

      // 4. 相对于工作目录
      path.join(process.cwd(), imagePath),

      // 5. 相对于工作目录的 images 子目录
      path.join(process.cwd(), 'images', imageName)
    ].filter(Boolean); // 过滤掉 null 值

    // 查找第一个存在的路径
    for (const location of possibleLocations) {
      if (fs.existsSync(location as PathLike)) {
        logger.debug(`找到图片文件: ${location}`);
        return location;
      }
    }

    // 记录所有尝试的路径
    logger.error(`找不到图片文件，尝试了以下路径: ${possibleLocations.join(', ')}`);
    return null;
  }

  private async handleResultData(ctx: Context, data: any) {
    try {
      // 如果数据是空的，不处理
      if (!data || Object.keys(data).length === 0) return;

      // 处理内容详情
      if (data.isDetail === true && data.imagePath) {
        // 尝试发送图片
        try {
          const resolvedPath = this.resolveImagePath(data.imagePath);
          
          if (resolvedPath) {
            await ctx.replyWithPhoto({ source: resolvedPath });
            logger.debug(`成功发送图片: ${resolvedPath}`);
          } else {
            // 如果没有找到图片，发送错误消息
            logger.error(`无法找到图片: ${data.imagePath}`);
            await ctx.reply(`无法找到与此内容关联的图片: ${path.basename(data.imagePath)}`);
          }
        } catch (error) {
          logger.error(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
          await ctx.reply(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        
        // 添加导航信息
        if (data.navigation && (data.navigation.hasNext || data.navigation.hasPrevious)) {
          let navMessage = '导航:';
          
          if (data.navigation.hasPrevious && data.navigation.prevCommand) {
            navMessage += ` ${data.navigation.prevCommand} (上一条)`;
          }
          
          if (data.navigation.hasNext && data.navigation.nextCommand) {
            navMessage += ` ${data.navigation.nextCommand} (下一条)`;
          }
          
          await ctx.reply(navMessage);
        }
        
        return; // 处理完毕
      }
      
      // 处理内容生成的结果 - 显示文本内容
      if (data.text && data.imagePath) {
        // 这是内容生成的结果，先发送文本内容
        await ctx.reply(`📝 生成的内容 (ID: ${data.id || '未知'}):\n\n${data.text}`);
        
        // 然后处理图片
        try {
          // 使用解析方法获取图片路径
          const resolvedPath = this.resolveImagePath(data.imagePath);

          if (resolvedPath) {
            await ctx.replyWithPhoto({ source: resolvedPath });
            logger.debug(`成功发送图片: ${resolvedPath}`);
          } else {
            // 如果没有找到图片，发送错误消息
            logger.error(`无法找到图片: ${data.imagePath}`);
            await ctx.reply(`无法找到图片: ${path.basename(data.imagePath)}`);
          }
        } catch (error) {
          logger.error(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
          await ctx.reply(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        return; // 已处理完毕，不需要继续处理
      }
      
      // 处理内容列表
      else if (Array.isArray(data)) {
        // 记录接收到的数据，便于调试
        logger.debug(`收到数组数据处理: 数组长度=${data.length}, 第一项=${JSON.stringify(data[0])}`);
        
        if (data.length === 0) {
          await ctx.reply('列表为空，没有找到数据');
          return;
        }
        
        // 检查是否是内容列表 (通过判断第一项是否有典型的内容字段)
        const firstItem = data[0];
        const isContentList = firstItem && (firstItem.text !== undefined || firstItem.ensLabel !== undefined);
        
        if (isContentList) {
          logger.debug(`识别为内容列表，开始格式化`);
          
          // 分批发送，避免消息过长
          const chunkSize = 5; // 每批显示5项
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            
            const formattedData = chunk.map((item, index) => {
              const itemIndex = i + index + 1;
              const textPreview = item.text 
                ? (item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text)
                : '无文本内容';
              
              return `ID: ${item.id || '未知ID'}\n` +
                     `社区: ${item.ensLabel || '未知社区'}\n` +
                     `状态: ${item.status || 'draft'}\n` +
                     `内容: ${textPreview}\n`;
            }).join('\n');
            
            // 发送这一批
            const batchInfo = data.length > chunkSize 
              ? `内容列表 (${i+1}-${Math.min(i+chunkSize, data.length)}/${data.length}):\n\n` 
              : `内容列表 (共${data.length}项):\n\n`;
              
            await ctx.reply(batchInfo + formattedData);
          }
        } else {
          // 处理其他类型的列表
          logger.debug(`非内容列表，使用通用格式化`);
          
          // 可能是其他类型的列表，使用通用处理
          const formattedData = data.map((item, index) => {
            if (item.id && typeof item.text === 'string') {
              // 看起来是内容项
              return `${index + 1}. ID: ${item.id} \n${item.text.substring(0, 100)}...\n`;
            } else if (item.address) {
              // 看起来是钱包项
              return `${index + 1}. 地址: ${item.address}`;
            } else if (item.username) {
              // 看起来是用户项
              return `${index + 1}. 用户名: ${item.username}`;
            } else {
              return `${index + 1}. ${JSON.stringify(item)}`;
            }
          }).join('\n');
          
          await ctx.reply(`数据列表 (${data.length} 项):\n${formattedData}`);
        }
      }
      // 处理其他复杂数据
      else if (typeof data === 'object') {
        const formattedData = Object.entries(data)
          .map(([key, value]) => {
            if (key === 'privateKey') {
              return `${key}: [已隐藏]`;
            }
            
            const valueStr = typeof value === 'object' 
              ? JSON.stringify(value) 
              : String(value);
            return `${key}: ${valueStr}`;
          })
          .join('\n');
        
        await ctx.reply(`返回数据:\n${formattedData}`);
      } 
      // 简单数据直接显示
      else {
        await ctx.reply(`返回数据: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logger.error(`处理结果数据失败: ${error instanceof Error ? error.message : '未知错误'}`, error);
      await ctx.reply('处理结果数据时出错，请查看日志');
    }
  }

  private createUserContext(ctx: Context) {
    const telegramUserId = ctx.from?.id.toString() || '';

    // 从白名单映射中获取系统用户ID
    const systemUserId = this.getMappedUserId(telegramUserId);

    const username = [
      ctx.from?.first_name,
      ctx.from?.last_name
    ].filter(Boolean).join(' ') || ctx.from?.username || 'Unknown';

    return {
      userId: systemUserId,  // 使用映射后的系统用户ID
      telegramUserId,        // 保存原始的Telegram用户ID
      username,
      platform: this.name,
      telegramContext: ctx   // 提供Telegram上下文，以便命令可以直接访问
    };
  }

  private parseArgs(args: string[], command: string): Record<string, any> {
    const parsedArgs: Record<string, any> = {};

    // 基于命令类型进行特殊处理
    if (command === 'content.generate') {
      // 第一个参数作为ensLabel
      if (args.length > 0) {
        parsedArgs.ensLabel = args[0];

        // 如果有更多参数，将其组合为prompt
        if (args.length > 1) {
          parsedArgs.prompt = args.slice(1).join(' ');
        }
      }
    }
    else if (command === 'content.list') {
      // 修改内容列表参数处理 - 支持索引查询
      if (args.length > 0) {
        parsedArgs.ensLabel = args[0];
        
        // 如果有第二个参数，可能是索引或ID
        if (args.length > 1) {
          const possibleIndex = parseInt(args[1]);
          if (!isNaN(possibleIndex)) {
            // 是数字，作为索引处理
            parsedArgs.index = possibleIndex;
          } else {
            // 不是数字，可能是内容ID
            parsedArgs.id = args[1];
          }
        }
      }
    }
    else if (command === 'content.add') {
      // ensLabel + text
      if (args.length > 0) {
        parsedArgs.ensLabel = args[0];

        if (args.length > 1) {
          parsedArgs.text = args.slice(1).join(' ');
        }
      }
    }
    else if (command === 'content.delete') {
      // contentId
      if (args.length > 0) {
        parsedArgs.id = args[0];
      }
    }
    else if (command === 'publish.content') {
      // 发布命令的特殊处理
      if (args.length > 0) {
        parsedArgs.ensLabel = args[0];

        if (args.length > 1) {
          parsedArgs.contentId = args[1];
        }

        if (args.length > 2) {
          parsedArgs.walletIndex = parseInt(args[2]);
        }
      }
    }
    else if (command === 'publish.quick') {
      // 快速发布命令
      if (args.length > 0) {
        parsedArgs.ensLabel = args[0];

        if (args.length > 1) {
          parsedArgs.text = args.slice(1).join(' ');
        }
      }
    }
    else if (command === 'wallet.add') {
      // 添加钱包
      if (args.length > 0) {
        parsedArgs.privateKey = args[0];
      }
    }
    else if (command === 'wallet.delete' || command === 'wallet.switch') {
      // 钱包索引操作
      if (args.length > 0) {
        parsedArgs.index = parseInt(args[0]);
      }
    }
    else if (command === 'user.add') {
      // 添加用户
      if (args.length > 0) {
        parsedArgs.username = args[0];

        if (args.length > 1) {
          parsedArgs.privateKey = args[1];
        }
      }
    }
    else if (command === 'user.switch' || command === 'user.delete') {
      // 用户操作
      if (args.length > 0) {
        parsedArgs.username = args[0];
      }
    }
    else if (command === 'scheduler.update') {
      // 调度器更新 - 支持多种格式参数
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
          const key = arg.substring(2);

          // 检查下一个参数是否存在且不是另一个命名参数
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            // 特殊处理数组类型参数
            if (key === 'ensLabels' || key === 'walletIndices' || key === 'enabledChains') {
              try {
                // 尝试解析为JSON数组
                if (args[i + 1].startsWith('[') && args[i + 1].endsWith(']')) {
                  parsedArgs[key] = JSON.parse(args[i + 1]);
                } else {
                  // 否则按逗号分隔
                  parsedArgs[key] = args[i + 1].split(',').map(item => item.trim());
                }
              } catch (e) {
                parsedArgs[key] = args[i + 1]; // 解析失败时保持原样
              }
            } else if (key === 'interval' || key === 'walletIndex') {
              // 数字类型参数
              parsedArgs[key] = parseInt(args[i + 1]);
            } else {
              // 其他参数
              parsedArgs[key] = args[i + 1];
            }
            i += 1; // 跳过值
          } else {
            // 布尔标志
            parsedArgs[key] = true;
          }
        }
      }
    }
    else if (command === 'system.cache') {
      // 缓存操作
      if (args.length > 0) {
        parsedArgs.action = args[0];
      }
    }
    else if (command === 'wallet.list' || command === 'user.list' ||
      command === 'scheduler.status' || command === 'scheduler.config' ||
      command === 'system.info' || command === 'system.diagnose' ||
      command === 'system.version' || command === 'scheduler.start' ||
      command === 'scheduler.stop') {
      // 这些命令通常不需要参数，或参数可选
    }
    else {
      // 通用参数处理逻辑 - 命名参数（--key value 格式）
      let i = 0;
      while (i < args.length) {
        const arg = args[i];

        if (arg.startsWith('--')) {
          const key = arg.substring(2);

          // 检查下一个参数是否存在且不是另一个命名参数
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            parsedArgs[key] = args[i + 1];
            i += 2; // 跳过键和值
          } else {
            // 如果没有值或下一个也是键，则设为布尔值true
            parsedArgs[key] = true;
            i += 1;
          }
        } else {
          // 未命名参数，添加到默认text中
          if (!parsedArgs.text) {
            parsedArgs.text = arg;
          } else if (typeof parsedArgs.text === 'string') {
            parsedArgs.text += ' ' + arg;
          }
          i += 1;
        }
      }
    }

    return parsedArgs;
  }

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

  async start(): Promise<boolean> {
    if (!this.bot) {
      logger.error('启动Telegram平台失败: 未初始化');
      return false;
    }

    try {
      if (this.isRunning) {
        logger.info('Telegram平台已经在运行中');
        return true;
      }

      // 启动Telegram机器人
      await this.bot.launch();
      this.isRunning = true;

      logger.info('Telegram平台启动成功');
      logger.info('机器人已准备好接收命令');

      // 设置机器人命令，让用户在Telegram中看到可用命令列表
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: '开始使用机器人' },
        { command: 'help', description: '显示帮助信息' },
        { command: 'content_generate', description: '生成内容 <社区> [提示词]' },
        { command: 'content_list', description: '列出内容 <社区> [序号/ID]' },
        { command: 'publish', description: '发布内容 <社区> <序号> [钱包索引]' },
        { command: 'quick_publish', description: '快速发布 <社区> [文本]' },
        { command: 'wallet_add', description: '添加钱包 <私钥>' },
        { command: 'wallet_list', description: '列出钱包' },
        { command: 'scheduler_status', description: '查看调度器状态' },
        { command: 'system_info', description: '显示系统信息' },
        { command: 'system_clear_images', description: '清理图片 [命名模式]' }
      ]);

      // 优雅地处理进程终止
      process.once('SIGINT', () => this.stop());
      process.once('SIGTERM', () => this.stop());

      return true;
    } catch (error) {
      logger.error(`启动Telegram平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.isRunning = false;
      return false;
    }
  }

  async stop(): Promise<boolean> {
    try {
      if (!this.isRunning || !this.bot) {
        logger.info('Telegram平台已经停止');
        return true;
      }

      // 停止Telegram机器人
      await this.bot.stop();
      this.isRunning = false;

      logger.info('Telegram平台已停止');
      return true;
    } catch (error) {
      logger.error(`停止Telegram平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  getInfo(): Record<string, any> {
    return {
      name: this.name,
      description: 'Telegram机器人平台',
      version: this.config?.VERSION || '0.0.1',
      isRunning: this.isRunning,
      botUsername: this.bot?.botInfo?.username || '未知'
    };
  }

  private async handleContentDetailCommand(ctx: Context) {
    const telegramUserId = ctx.from?.id.toString() || '';
    const isAuthorized = this.checkAuthorization(telegramUserId);
    
    if (!isAuthorized) {
      await ctx.reply('您没有使用此机器人的权限。');
      return;
    }
    
    // @ts-ignore
    const message = ctx?.message?.text as any;
    const parts = message?.split(' ');
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
      const userContext = this.createUserContext(ctx);
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
          const resolvedPath = this.resolveImagePath(content.imagePath);
          
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

  /**
   * 清理图片文件
   * @param directory 图片目录
   * @param pattern 可选的文件名过滤模式
   * @returns 清理结果，包含删除的文件数量和释放的空间
   */
  private async cleanupImages(directory: string, pattern: string = ''): Promise<{count: number, size: number}> {
    try {
      logger.info(`开始清理图片目录: ${directory}${pattern ? `, 过滤模式: ${pattern}` : ''}`);
      
      let count = 0;
      let size = 0;
      
      // 读取目录中的所有文件
      const files = fs.readdirSync(directory);
      
      // 图片文件扩展名
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      
      // 遍历并清理文件
      for (const file of files) {
        try {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          
          // 只处理文件，不处理目录
          if (!stats.isDirectory()) {
            // 检查是否是图片文件
            const ext = path.extname(file).toLowerCase();
            if (imageExtensions.includes(ext)) {
              // 应用命名模式过滤
              if (!pattern || file.includes(pattern)) {
                // 删除文件并记录大小
                size += stats.size;
                fs.unlinkSync(filePath);
                count++;
                logger.debug(`已删除图片: ${file}`);
              }
            }
          }
        } catch (error) {
          logger.error(`处理文件时出错: ${file}`, error);
          // 继续处理其他文件
        }
      }
      
      logger.info(`图片清理完成，删除了${count}个文件，释放了${this.formatBytes(size)}空间`);
      
      return { count, size };
    } catch (error) {
      logger.error('清理图片文件失败', error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 