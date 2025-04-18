/**
 * 调度器命令处理器
 * 支持通过配置文件进行灵活的时间调度
 */
import { CommandModule, CommandHandler, CommandResult } from '../types';
import { CommandRouter } from './command-router';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { setTimeout } from 'timers/promises';

// 调度任务接口
interface ScheduleTask {
  id: string;
  time: string;
  community: string;
  contentCount: number;
  interval: number;
  contentType?: string;
  useCache?: boolean;
  walletIndex?: number;     // 指定钱包索引
  useRandomWallet?: boolean; // 是否使用随机钱包
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

/**
 * 调度器命令模块
 */
export class SchedulerCommands implements CommandModule {
  public name = 'scheduler';
  private configDir: string;
  private dataDir: string;
  private tasksConfigPath: string;
  private historyPath: string;

  /**
   * 构造函数
   */
  constructor() {
    // 路径设置 - 使用admin目录下的scheduler子目录
    this.configDir = path.join(process.cwd(), 'config');
    this.dataDir = path.join(process.cwd(), 'tmp');
    this.tasksConfigPath = path.join(this.dataDir, 'admin', 'scheduler', 'tasks.json');
    this.historyPath = path.join(this.dataDir, 'admin', 'scheduler', 'history.json');

    // 确保必要目录存在
    this.ensureDirectories();
  }

  /**
   * 确保必要目录存在
   */
  private async ensureDirectories() {
    try {
      // 确保管理员目录存在
      const adminDir = path.join(this.dataDir, 'admin');
      if (!existsSync(adminDir)) {
        await fs.mkdir(adminDir, { recursive: true });
      }
      
      // 确保调度器目录存在
      const schedulerDir = path.join(adminDir, 'scheduler');
      if (!existsSync(schedulerDir)) {
        await fs.mkdir(schedulerDir, { recursive: true });
      }
    } catch (error) {
      logger.error('创建目录失败', error);
    }
  }

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    // 原有命令
    router.registerHandler('scheduler.start', this.startScheduler);
    router.registerHandler('scheduler.stop', this.stopScheduler);
    router.registerHandler('scheduler.status', this.getSchedulerStatus);
    router.registerHandler('scheduler.config', this.getSchedulerConfig);
    router.registerHandler('scheduler.update', this.updateSchedulerConfig);

    // 新增的调度任务管理命令
    router.registerHandler('scheduler.add_task', this.addScheduleTask);
    router.registerHandler('scheduler.list_tasks', this.listScheduleTasks);
    router.registerHandler('scheduler.delete_task', this.deleteScheduleTask);
    router.registerHandler('scheduler.enable_task', this.enableScheduleTask);
    router.registerHandler('scheduler.disable_task', this.disableScheduleTask);
    router.registerHandler('scheduler.execute_task', this.executeScheduleTask);
  }

  /**
   * 加载调度任务
   */
  private async loadTasks(): Promise<ScheduleTask[]> {
    try {
      // 检查文件是否存在
      try {
        await fs.access(this.tasksConfigPath);
      } catch (error) {
        // 文件不存在，创建空的任务列表
        await fs.writeFile(
          this.tasksConfigPath,
          JSON.stringify({ tasks: [] }, null, 2)
        );
        return [];
      }

      // 读取配置文件
      const content = await fs.readFile(this.tasksConfigPath, 'utf8');
      const data = JSON.parse(content);
      return data.tasks || [];
    } catch (error) {
      logger.error('加载调度任务失败', error);
      return [];
    }
  }

  /**
   * 保存调度任务
   */
  private async saveTasks(tasks: ScheduleTask[]): Promise<boolean> {
    try {
      await fs.writeFile(
        this.tasksConfigPath,
        JSON.stringify({ tasks }, null, 2)
      );
      return true;
    } catch (error) {
      logger.error('保存调度任务失败', error);
      return false;
    }
  }

  /**
   * 添加调度任务
   */
  private addScheduleTask: CommandHandler = async ({ args, context }) => {
    try {
      // 验证参数
      const time = args.time;
      const community = args.community;
      const contentCount = parseInt(args.count);
      const interval = parseInt(args.interval);
      const useCache = args.useCache === 'true' || args.useCache === true;
      const useRandomWallet = args.randomWallet === 'true' || args.randomWallet === true;
      let walletIndex = undefined;
      
      // 只有当不使用随机钱包时，才处理钱包索引
      if (!useRandomWallet && args.walletIndex !== undefined) {
        walletIndex = parseInt(args.walletIndex);
        // 验证钱包索引
        if (isNaN(walletIndex) || walletIndex < 0) {
          return {
            success: false,
            message: '钱包索引必须是大于等于0的整数'
          };
        }
      }

      // 验证时间格式
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
        return {
          success: false,
          message: '时间格式不正确，应为HH:MM (例如 08:30)'
        };
      }

      if (!community) {
        return {
          success: false,
          message: '请指定目标社区'
        };
      }

      if (isNaN(contentCount) || contentCount < 1) {
        return {
          success: false,
          message: '发布数量必须是大于0的整数'
        };
      }

      if (isNaN(interval) || interval < 1) {
        return {
          success: false,
          message: '间隔时间必须是大于0的整数(分钟)'
        };
      }

      // 生成唯一ID
      const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 创建新任务
      const newTask: ScheduleTask = {
        id: taskId,
        time,
        community,
        contentCount,
        interval,
        contentType: args.type || 'default',
        useCache,
        walletIndex,
        useRandomWallet,
        enabled: true,
        createdBy: context?.userId || 'unknown',
        createdAt: new Date().toISOString()
      };

      // 加载现有任务
      const tasks = await this.loadTasks();

      // 添加新任务
      tasks.push(newTask);

      // 保存更新后的任务列表
      const success = await this.saveTasks(tasks);

      if (success) {
        // 构建钱包信息消息
        let walletMessage = '';
        if (useRandomWallet) {
          walletMessage = '使用随机钱包';
        } else if (walletIndex !== undefined) {
          walletMessage = `使用钱包索引: ${walletIndex}`;
        } else {
          walletMessage = '使用默认钱包';
        }
        
        return {
          success: true,
          message: `已添加定时任务！\n\nID: ${taskId}\n时间: ${time}\n社区: ${community}\n发布数量: ${contentCount}\n间隔: ${interval}分钟\n使用缓存: ${useCache ? '是' : '否'}\n钱包设置: ${walletMessage}`,
          data: newTask
        };
      } else {
        return {
          success: false,
          message: '添加定时任务失败，无法保存配置'
        };
      }
    } catch (error) {
      logger.error('添加调度任务失败', error);
      return {
        success: false,
        message: `添加定时任务失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 列出调度任务
   */
  private listScheduleTasks: CommandHandler = async () => {
    try {
      // 加载任务
      const tasks = await this.loadTasks();

      if (tasks.length === 0) {
        return {
          success: true,
          message: '当前没有定时任务'
        };
      }

      // 构建任务列表消息
      let message = '📋 定时任务列表:\n\n';

      for (const task of tasks) {
        const status = task.enabled ? '✅ 已启用' : '❌ 已禁用';
        const useCache = task.useCache ? '✅ 是' : '❌ 否';
        message += `🔸 ID: ${task.id}\n`;
        message += `⏰ 时间: ${task.time}\n`;
        message += `🌐 社区: ${task.community}\n`;
        message += `📊 发布: ${task.contentCount}条，间隔${task.interval}分钟\n`;
        message += `🔄 使用缓存: ${useCache}\n`;
        
        // 添加钱包信息
        if (task.useRandomWallet) {
          message += `💼 钱包: 随机选择\n`;
        } else if (task.walletIndex !== undefined) {
          message += `💼 钱包: 索引 ${task.walletIndex}\n`;
        } else {
          message += `💼 钱包: 使用默认\n`;
        }
        
        message += `📌 状态: ${status}\n`;
        message += `👤 创建者: ${task.createdBy}\n\n`;
      }

      message += '📝 使用 /schedule_delete ID 删除任务\n';
      message += '📝 使用 /schedule_enable ID 启用任务\n';
      message += '📝 使用 /schedule_disable ID 禁用任务\n';
      message += '📝 使用 /schedule_execute ID 立即执行任务';

      return {
        success: true,
        message,
        data: { tasks }
      };
    } catch (error) {
      logger.error('获取调度任务列表失败', error);
      return {
        success: false,
        message: `获取定时任务列表失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 删除调度任务
   */
  private deleteScheduleTask: CommandHandler = async ({ args }) => {
    try {
      const taskId = args.id;

      if (!taskId) {
        return {
          success: false,
          message: '请提供要删除的任务ID'
        };
      }

      // 加载任务
      const tasks = await this.loadTasks();

      // 查找任务索引
      const taskIndex = tasks.findIndex(task => task.id === taskId);

      if (taskIndex === -1) {
        return {
          success: false,
          message: `未找到ID为 ${taskId} 的任务`
        };
      }

      // 保存任务详情用于响应
      const taskDetails = tasks[taskIndex];

      // 删除任务
      tasks.splice(taskIndex, 1);

      // 保存更新后的任务列表
      const success = await this.saveTasks(tasks);

      if (success) {
        return {
          success: true,
          message: `已删除定时任务:\n\nID: ${taskId}\n时间: ${taskDetails.time}\n社区: ${taskDetails.community}`
        };
      } else {
        return {
          success: false,
          message: '删除定时任务失败，无法保存配置'
        };
      }
    } catch (error) {
      logger.error('删除调度任务失败', error);
      return {
        success: false,
        message: `删除定时任务失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 启用调度任务
   */
  private enableScheduleTask: CommandHandler = async ({ args }) => {
    try {
      const taskId = args.id;

      if (!taskId) {
        return {
          success: false,
          message: '请提供要启用的任务ID'
        };
      }

      // 加载任务
      const tasks = await this.loadTasks();

      // 查找任务
      const task = tasks.find(task => task.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `未找到ID为 ${taskId} 的任务`
        };
      }

      // 如果任务已经启用
      if (task.enabled) {
        return {
          success: true,
          message: `任务已经处于启用状态:\n\nID: ${taskId}\n时间: ${task.time}\n社区: ${task.community}`
        };
      }

      // 启用任务
      task.enabled = true;

      // 保存更新后的任务列表
      const success = await this.saveTasks(tasks);

      if (success) {
        return {
          success: true,
          message: `已启用定时任务:\n\nID: ${taskId}\n时间: ${task.time}\n社区: ${task.community}`
        };
      } else {
        return {
          success: false,
          message: '启用定时任务失败，无法保存配置'
        };
      }
    } catch (error) {
      logger.error('启用调度任务失败', error);
      return {
        success: false,
        message: `启用定时任务失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 禁用调度任务
   */
  private disableScheduleTask: CommandHandler = async ({ args }) => {
    try {
      const taskId = args.id;

      if (!taskId) {
        return {
          success: false,
          message: '请提供要禁用的任务ID'
        };
      }

      // 加载任务
      const tasks = await this.loadTasks();

      // 查找任务
      const task = tasks.find(task => task.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `未找到ID为 ${taskId} 的任务`
        };
      }

      // 如果任务已经禁用
      if (!task.enabled) {
        return {
          success: true,
          message: `任务已经处于禁用状态:\n\nID: ${taskId}\n时间: ${task.time}\n社区: ${task.community}`
        };
      }

      // 禁用任务
      task.enabled = false;

      // 保存更新后的任务列表
      const success = await this.saveTasks(tasks);

      if (success) {
        return {
          success: true,
          message: `已禁用定时任务:\n\nID: ${taskId}\n时间: ${task.time}\n社区: ${task.community}`
        };
      } else {
        return {
          success: false,
          message: '禁用定时任务失败，无法保存配置'
        };
      }
    } catch (error) {
      logger.error('禁用调度任务失败', error);
      return {
        success: false,
        message: `禁用定时任务失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 立即执行调度任务
   */
  private executeScheduleTask: CommandHandler = async ({ args, services, context }) => {
    try {
      const taskId = args.id;

      if (!taskId) {
        return {
          success: false,
          message: '请提供要执行的任务ID'
        };
      }

      // 加载任务
      const tasks = await this.loadTasks();

      // 查找任务
      const task = tasks.find(task => task.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `未找到ID为 ${taskId} 的任务`
        };
      }

      // 提示正在执行
      const message = `正在执行定时任务:\n\nID: ${taskId}\n时间: ${task.time}\n社区: ${task.community}\n发布数量: ${task.contentCount}条\n\n执行结果将另行通知。`;

      // 异步执行任务，不等待完成
      this.executeTaskAsync(task, services, context);

      return {
        success: true,
        message
      };
    } catch (error) {
      logger.error('执行调度任务失败', error);
      return {
        success: false,
        message: `执行调度任务失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(task: ScheduleTask, services: any, context: any) {
    try {
      logger.info(`开始执行任务 ${task.id}: 在 ${task.community} 发布 ${task.contentCount} 条内容`);

      const contentService = services.contentService;
      const publishService = services.publishService;

      if (!contentService || !publishService) {
        logger.error('服务未初始化，无法执行任务');
        return;
      }

      const results = [];

      // 执行多次内容发布
      for (let i = 0; i < task.contentCount; i++) {
        // 如果不是第一次发布，等待指定的间隔时间

        if (i > 0) {
          const waitTimeMs = Math.min(task.interval * 60 * 1000, 5 * 60 * 1000);
          logger.info(`等待 ${waitTimeMs / 1000} 秒后发布下一条内容...`);
          await setTimeout(waitTimeMs);
        }

        try {
          // 获取要发布的内容
          const content = await contentService.getContent(task.contentType);

          // 发布内容到指定社区
          const publishResult = await publishService.publish({
            community: task.community,
            content,
            user: context
          });

          logger.info(`发布 #${i + 1} 结果:`, publishResult);
          results.push(`✅ 发布 #${i + 1}: 成功`);
        } catch (error) {
          logger.error(`发布 #${i + 1} 失败:`, error);
          results.push(`❌ 发布 #${i + 1}: 失败 - ${(error as Error).message || String(error)}`);
        }
      }

      logger.info(`任务 ${task.id} 执行完成，结果:`, results);

      // 这里可以添加发送结果通知的逻辑

    } catch (error) {
      logger.error(`执行任务 ${task.id} 过程中出错:`, error);
    }
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
      const schedulerService = services.scheduler;
      
      if (!schedulerService) {
        return {
          success: false,
          message: '调度器服务未初始化'
        };
      }

      // 解析配置
      const config = {
        ...args
      };

      // 更新配置
      const result = await schedulerService.updateConfig(config);
      
      if (result) {
        return {
          success: true,
          message: '调度器配置已更新'
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