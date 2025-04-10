/**
 * 命令路由器 - 将命令分发给相应的处理器
 */
import { ServiceContainer } from '../services';
import { CommandResult, CommandContext, CommandHandler } from '../types';
import logger from '../utils/logger.js';

/**
 * 命令路由器
 */
export class CommandRouter {
  private services: ServiceContainer;
  private handlers: Record<string, CommandHandler>;
  
  /**
   * 构造函数
   */
  constructor(services: ServiceContainer) {
    this.services = services;
    
    // 注册命令处理器
    this.handlers = {};
  }
  
  /**
   * 注册命令处理器
   */
  public registerHandler(command: string, handler: CommandHandler): void {
    this.handlers[command] = handler;
    logger.debug(`注册命令处理器: ${command}`);
  }
  
  /**
   * 路由命令
   */
  public async route(
    command: string, 
    args: any, 
    context: CommandContext = { userId: 'admin' }
  ): Promise<CommandResult> {
    // 处理命令分隔符 (将 'wallet list' 转换为 'wallet.list')
    const normalizedCommand = command.replace(/\s+/g, '.');
    
    // 查找处理器
    const handler = this.handlers[normalizedCommand];
    if (!handler) {
      logger.warn(`未知命令: ${command}`);
      return { 
        success: false, 
        message: `未知命令: ${command}`
      };
    }
    
    try {
      logger.info(`执行命令: ${command}`, { args, context });
      
      // 如果传入的userId不是当前用户，切换用户
      if (context.userId && context.userId !== this.services.user.getCurrentUser()) {
        const switched = await this.services.user.switchUser(context.userId);
        if (!switched) {
          logger.warn(`切换用户失败: ${context.userId}`);
        }
      }
      
      // 执行命令
      const result = await handler({
        services: this.services,
        args,
        context
      });
      
      logger.debug(`命令执行结果: ${command}`, { success: result.success });
      return result;
    } catch (error) {
      logger.error(`执行命令出错: ${command}`, error);
      return { 
        success: false, 
        message: `执行出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
  
  /**
   * 获取所有命令
   */
  public getCommands(): string[] {
    return Object.keys(this.handlers);
  }
} 