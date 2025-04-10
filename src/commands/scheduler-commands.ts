/**
 * 调度器命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types';
import { CommandRouter } from './command-router';
import logger from '../utils/logger.js';

/**
 * 调度器命令模块
 */
export class SchedulerCommands implements CommandModule {
  public name = 'scheduler';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('scheduler.start', this.startScheduler);
    router.registerHandler('scheduler.stop', this.stopScheduler);
    router.registerHandler('scheduler.status', this.getSchedulerStatus);
    router.registerHandler('scheduler.config', this.getSchedulerConfig);
    router.registerHandler('scheduler.update', this.updateSchedulerConfig);
  }

  /**
   * 启动调度器
   */
  private startScheduler: CommandHandler = async ({ services }) => {
    try {
      const scheduler = services.scheduler;
      const result = await scheduler.start();

      if (result) {
        const config = scheduler.getConfig();
        return {
          success: true,
          message: '调度器已启动',
          data: {
            interval: config.interval,
            communities: config.ensLabels,
            nextRunTime: scheduler.getStatus().nextRunTime
          }
        };
      } else {
        return {
          success: false,
          message: '调度器启动失败，可能已在运行'
        };
      }
    } catch (error) {
      logger.error('启动调度器失败', error);
      return {
        success: false,
        message: `启动调度器失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 停止调度器
   */
  private stopScheduler: CommandHandler = async ({ services }) => {
    try {
      const scheduler = services.scheduler;
      const result = await scheduler.stop();

      if (result) {
        return {
          success: true,
          message: '调度器已停止'
        };
      } else {
        return {
          success: false,
          message: '调度器停止失败，可能未在运行'
        };
      }
    } catch (error) {
      logger.error('停止调度器失败', error);
      return {
        success: false,
        message: `停止调度器失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 获取调度器状态
   */
  private getSchedulerStatus: CommandHandler = async ({ services }) => {
    try {
      const scheduler = services.scheduler;
      const status = scheduler.getStatus();
      const config = scheduler.getConfig();

      return {
        success: true,
        message: '获取调度器状态成功',
        data: {
          ...status,
          interval: config.interval,
          ensLabels: config.ensLabels,
          enabledChains: config.enabledChains,
          walletIndices: config.walletIndices,
          cronExpression: config.cronExpression,
          useRandomContent: config.useRandomContent
        }
      };
    } catch (error) {
      logger.error('获取调度器状态失败', error);
      return {
        success: false,
        message: `获取调度器状态失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 获取调度器配置
   */
  private getSchedulerConfig: CommandHandler = async ({ services }) => {
    try {
      const scheduler = services.scheduler;
      const config = await scheduler.getConfig();

      return {
        success: true,
        message: '获取调度器配置成功',
        data: config
      };
    } catch (error) {
      logger.error('获取调度器配置失败', error);
      return {
        success: false,
        message: `获取调度器配置失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 更新调度器配置
   */
  private updateSchedulerConfig: CommandHandler = async ({ services, args }) => {
    try {
      const scheduler = services.scheduler;

      const newConfig: any = {};

      // 处理间隔设置
      if (args.interval !== undefined) {
        const interval = parseInt(args.interval);
        if (isNaN(interval) || interval < 1) {
          return {
            success: false,
            message: '间隔必须是大于0的整数'
          };
        }
        newConfig.interval = interval;
      }

      // 处理社区列表
      if (args.ensLabels !== undefined) {
        let ensLabels = args.ensLabels;

        // 如果是字符串，尝试解析为数组
        if (typeof ensLabels === 'string') {
          try {
            if (ensLabels.startsWith('[') && ensLabels.endsWith(']')) {
              ensLabels = JSON.parse(ensLabels);
            } else {
              // 如果是逗号分隔的字符串
              ensLabels = ensLabels.split(',').map((label: string) => label.trim());
            }
          } catch (e) {
            return {
              success: false,
              message: '无法解析社区列表，请使用逗号分隔或JSON数组'
            };
          }
        }

        // 确保是数组类型
        if (!Array.isArray(ensLabels)) {
          return {
            success: false,
            message: '社区列表必须是数组'
          };
        }

        newConfig.ensLabels = ensLabels;
      }

      // 处理用户ID
      if (args.userId !== undefined) {
        newConfig.userId = args.userId;
      }

      // 处理钱包索引
      if (args.walletIndex !== undefined) {
        const walletIndex = parseInt(args.walletIndex);
        if (isNaN(walletIndex) || walletIndex < 0) {
          return {
            success: false,
            message: '钱包索引必须是大于等于0的整数'
          };
        }
        newConfig.walletIndex = walletIndex;
      }

      // 如果没有任何配置需要更新
      if (Object.keys(newConfig).length === 0) {
        return {
          success: false,
          message: '未提供任何配置更新'
        };
      }

      // 更新配置
      const result = await scheduler.updateConfig(newConfig);

      if (result) {
        const updatedConfig = scheduler.getConfig();
        return {
          success: true,
          message: '调度器配置已更新',
          data: updatedConfig
        };
      } else {
        return {
          success: false,
          message: '调度器配置更新失败'
        };
      }
    } catch (error) {
      logger.error('更新调度器配置失败', error);
      return {
        success: false,
        message: `更新调度器配置失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 