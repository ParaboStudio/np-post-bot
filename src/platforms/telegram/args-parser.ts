/**
 * Telegram参数解析器模块
 * 负责将Telegram命令参数解析为内部命令参数
 */
import { logger } from '../../utils/logger.js';

/**
 * 命令参数处理器接口
 */
interface CommandParamsHandler {
  (args: string[]): Record<string, any>;
}

/**
 * Telegram参数解析器
 */
export class TelegramArgsParser {
  // 命令处理器映射
  private commandHandlers: Record<string, CommandParamsHandler> = {};

  constructor() {
    this.initCommandHandlers();
  }

  /**
   * 初始化命令处理器映射
   */
  private initCommandHandlers() {
    // 内容相关命令
    this.commandHandlers['content.generate'] = this.handleContentGenerateParams;
    this.commandHandlers['content.list'] = this.handleContentListParams;
    this.commandHandlers['content.add'] = this.handleContentAddParams;
    this.commandHandlers['content.delete'] = this.handleContentDeleteParams;
    this.commandHandlers['content.detail'] = this.handleContentListParams; // 复用内容列表参数解析逻辑

    // 发布相关命令
    this.commandHandlers['publish.content'] = this.handlePublishContentParams;
    this.commandHandlers['publish.quick'] = this.handleQuickPublishParams;

    // 钱包相关命令
    this.commandHandlers['wallet.add'] = this.handleWalletAddParams;
    this.commandHandlers['wallet.delete'] = this.handleWalletIndexParams;
    this.commandHandlers['wallet.switch'] = this.handleWalletIndexParams;

    // 用户相关命令
    this.commandHandlers['user.add'] = this.handleUserAddParams;
    this.commandHandlers['user.switch'] = this.handleUserParams;
    this.commandHandlers['user.delete'] = this.handleUserParams;

    // 调度器相关命令
    this.commandHandlers['scheduler.update'] = this.handleSchedulerUpdateParams;
    this.commandHandlers['system.cache'] = this.handleSystemCacheParams;
    this.commandHandlers['system.clear_images'] = this.handleClearImagesParams;
  }

  /**
   * 解析命令参数
   */
  public parseArgs(args: string[], command: string): Record<string, any> {
    // 检查是否有专门的处理器
    const handler = this.commandHandlers[command];
    
    if (handler) {
      // 使用专门的处理器
      const parsedArgs = handler(args);
      logger.debug(`命令 ${command} 解析参数: ${JSON.stringify(parsedArgs)}`);
      return parsedArgs;
    }
    
    // 默认通用参数处理
    const parsedArgs = this.handleGenericParams(args);
    logger.debug(`命令 ${command} 使用通用解析器，参数: ${JSON.stringify(parsedArgs)}`);
    return parsedArgs;
  }

  // 处理 content.generate 命令的参数
  private handleContentGenerateParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.ensLabel = args[0];

      if (args.length > 1) {
        parsedArgs.prompt = args.slice(1).join(' ');
      }
    }

    return parsedArgs;
  };

  // 处理 content.list 和 content.detail 命令的参数
  private handleContentListParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

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

    return parsedArgs;
  };

  // 处理 content.add 命令的参数
  private handleContentAddParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.ensLabel = args[0];

      if (args.length > 1) {
        parsedArgs.text = args.slice(1).join(' ');
      }
    }

    return parsedArgs;
  };

  // 处理 content.delete 命令的参数
  private handleContentDeleteParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.id = args[0];
    }

    return parsedArgs;
  };

  // 处理 publish.content 命令的参数
  private handlePublishContentParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.ensLabel = args[0];

      if (args.length > 1) {
        parsedArgs.contentId = args[1];
      }

      if (args.length > 2) {
        parsedArgs.walletIndex = parseInt(args[2]);
      }
    }

    return parsedArgs;
  };

  // 处理 publish.quick 命令的参数
  private handleQuickPublishParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.ensLabel = args[0];

      if (args.length > 1) {
        parsedArgs.text = args.slice(1).join(' ');
      }
    }

    return parsedArgs;
  };

  // 处理 wallet.add 命令的参数
  private handleWalletAddParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.privateKey = args[0];
    }

    return parsedArgs;
  };

  // 处理需要钱包索引的命令（wallet.delete, wallet.switch）
  private handleWalletIndexParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.index = parseInt(args[0]);
    }

    return parsedArgs;
  };

  // 处理 user.add 命令的参数
  private handleUserAddParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.username = args[0];

      if (args.length > 1) {
        parsedArgs.privateKey = args[1];
      }
    }

    return parsedArgs;
  };

  // 处理需要用户名的命令（user.switch, user.delete）
  private handleUserParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.username = args[0];
    }

    return parsedArgs;
  };

  // 处理 scheduler.update 命令的参数（较复杂）
  private handleSchedulerUpdateParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

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

    return parsedArgs;
  };

  // 处理 system.cache 命令的参数
  private handleSystemCacheParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.action = args[0];
    }

    return parsedArgs;
  };

  // 处理 system.clear_images 命令的参数
  private handleClearImagesParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};

    if (args.length > 0) {
      parsedArgs.pattern = args[0];
    }

    return parsedArgs;
  };

  // 通用参数处理逻辑 - 处理命名参数（--key value 格式）
  private handleGenericParams = (args: string[]): Record<string, any> => {
    const parsedArgs: Record<string, any> = {};
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

    return parsedArgs;
  };
} 