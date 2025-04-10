/**
 * CLI平台实现
 */
import readline from 'readline';
import { logger } from '../utils/logger.js';
import { Platform, PlatformInitOptions, executeCommand } from './platform-interface.js';
import { ServiceContainer } from '../types/services.js';
import { CommandRouter } from '../commands/command-router.js';
import { Config } from '../types/index.js';

export class CliPlatform implements Platform {
  name = 'cli';
  private rl: readline.Interface | null = null;
  private services: ServiceContainer | null = null;
  private commandRouter: CommandRouter | null = null;
  private config: Config | null = null;
  private isRunning: boolean = false;
  private shouldExit: boolean = false;

  async init(options?: PlatformInitOptions): Promise<boolean> {
    if (!options) {
      logger.error('初始化CLI平台失败: 未提供初始化选项');
      return false;
    }

    try {
      const { services, commandRouter, config } = options;
      this.services = services;
      this.commandRouter = commandRouter;
      this.config = config;

      // 创建命令行界面
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
      });

      logger.info('CLI平台初始化成功');
      return true;
    } catch (error) {
      logger.error(`初始化CLI平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.rl || !this.commandRouter) {
      logger.error('启动CLI平台失败: 未初始化');
      return false;
    }

    try {
      if (this.isRunning) {
        logger.info('CLI平台已经在运行中');
        return true;
      }

      this.isRunning = true;
      this.shouldExit = false;
      
      // 显示欢迎信息
      console.log('欢迎使用内容发布CLI！输入 "help" 获取命令列表，输入 "exit" 退出。');
      this.rl.prompt();

      // 设置命令行交互处理
      this.rl.on('line', async (line) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'exit') {
          await this.stop();
          return;
        }

        // 解析命令和参数
        const [command, ...args] = trimmedLine.split(' ');
        
        if (command) {
          const result = await this.handleCommand(command, this.parseArgs(args));
          console.log(result.message);
          
          if (result.data && Object.keys(result.data).length > 0) {
            console.log('返回数据:', JSON.stringify(result.data, null, 2));
          }
        }

        if (this.isRunning && !this.shouldExit) {
          this.rl?.prompt();
        }
      });

      // 监听关闭事件
      this.rl.on('close', () => {
        if (this.isRunning) {
          this.stop();
        }
      });

      logger.info('CLI平台启动成功');
      return true;
    } catch (error) {
      logger.error(`启动CLI平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.isRunning = false;
      return false;
    }
  }

  private parseArgs(args: string[]): Record<string, any> {
    // 根据不同命令解析参数
    if (args.length === 0) return {};

    const command = args[0];
    const parsedArgs: Record<string, any> = {};

    // 针对不同命令格式化参数
    switch (command) {
      case 'generate':
        parsedArgs.prompt = args.slice(1).join(' ');
        break;
      case 'publish':
        parsedArgs.contentId = args[1];
        break;
      default:
        // 尝试将所有参数解析为键值对
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = i + 1 < args.length && !args[i + 1].startsWith('--') 
              ? args[++i] 
              : true;
            parsedArgs[key] = value;
          }
        }
        break;
    }

    return parsedArgs;
  }

  private async handleCommand(command: string, args: Record<string, any>) {
    if (!this.commandRouter) {
      return { 
        success: false, 
        message: '命令路由器未初始化' 
      };
    }

    // 构建用户上下文
    const userContext = {
      userId: 'cli-user',
      username: 'CLI用户',
      platform: this.name
    };

    try {
      return await executeCommand(this.commandRouter, command, args, userContext);
    } catch (error) {
      return {
        success: false,
        message: `命令执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  async stop(): Promise<boolean> {
    try {
      if (!this.isRunning) {
        logger.info('CLI平台已经停止');
        return true;
      }

      this.shouldExit = true;
      this.isRunning = false;

      // 关闭readline接口
      if (this.rl) {
        this.rl.close();
        this.rl = null;
      }
      
      logger.info('CLI平台已停止');
      return true;
    } catch (error) {
      logger.error(`停止CLI平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  getInfo(): Record<string, any> {
    return {
      name: this.name,
      isRunning: this.isRunning
    };
  }
} 