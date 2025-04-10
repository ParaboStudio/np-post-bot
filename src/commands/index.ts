/**
 * 命令模块索引
 */
import { CommandRouter } from './command-router.js';
import { ServiceContainer } from '../services/index.js';
import { WalletCommands } from './wallet-commands.js';
import { ContentCommands } from './content-commands.js';
import { PublishCommands } from './publish-commands.js';
import { UserCommands } from './user-commands.js';
import { SchedulerCommands } from './scheduler-commands.js';
import { SystemCommands } from './system-commands.js';
import logger from '../utils/logger.js';

/**
 * 初始化命令路由器
 */
export function initCommandRouter(services: ServiceContainer): CommandRouter {
  // 创建命令路由器
  const commandRouter = new CommandRouter(services);
  
  try {
    // 注册命令模块
    const modules = [
      new WalletCommands(),
      new ContentCommands(),
      new PublishCommands(),
      new UserCommands(),
      new SchedulerCommands(),
      new SystemCommands()
    ];
    
    // 初始化所有模块
    for (const module of modules) {
      logger.info(`注册命令模块: ${module.name}`);
      module.register(commandRouter);
    }
    
    logger.info('命令路由器初始化完成');
  } catch (error) {
    logger.error('命令路由器初始化失败', error);
  }
  
  return commandRouter;
}

// 导出命令类
export * from './command-router.js';
export * from './wallet-commands.js';
export * from './content-commands.js';
export * from './publish-commands.js';
export * from './user-commands.js';
export * from './scheduler-commands.js';
export * from './system-commands.js'; 