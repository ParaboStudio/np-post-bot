/**
 * 平台接口 - 所有平台实现的基础
 */
import { ServiceContainer } from '../types/services.js';
import { CommandRouter } from '../commands/command-router.js';
import { Config } from '../types/index.js';

export interface Platform {
  name: string;
  init: (options?: PlatformInitOptions) => Promise<boolean>;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  getInfo: () => Record<string, any>;
}

/**
 * 平台初始化参数
 */
export interface PlatformInitOptions {
  services: ServiceContainer;
  commandRouter: CommandRouter;
  config: Config;
}

/**
 * 平台命令处理结果
 */
export interface PlatformCommandResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * 统一命令处理函数
 */
export async function executeCommand(
  commandRouter: CommandRouter,
  command: string, 
  args: any, 
  context: any = {}
): Promise<PlatformCommandResult> {
  try {
    return await commandRouter.route(command, args, context);
  } catch (error: unknown) {
    return {
      success: false,
      message: `执行命令失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
} 