/**
 * 调度器服务 - 负责定时内容发布
 */
import { PostingService, StorageService, UserService, ChainService } from './index.js';
import logger from '../utils/logger.js';
import { SchedulerStatus, SchedulerConfig } from '../types/index.js';
import config from '../config/index.js';

/**
 * 调度器服务配置项
 */
export interface SchedulerServiceOptions {
  posting: PostingService;
  storage: StorageService;
  user: UserService;
  chain: ChainService;
}

/**
 * Cron表达式解析器
 */
class CronParser {
  /**
   * 检查当前时间是否匹配Cron表达式
   * 简化的crontab格式: 分 时 日 月 星期
   * @param cronExpression Cron表达式
   * @returns 是否匹配
   */
  static isTimeMatching(cronExpression: string): boolean {
    try {
      if (!cronExpression) return false;

      // 将cron表达式分解为组件
      const parts = cronExpression.split(' ');
      if (parts.length !== 5) {
        logger.warn(`无效的Cron表达式: ${cronExpression}, 需要5个组件`);
        return false;
      }

      const now = new Date();
      const minute = now.getMinutes();
      const hour = now.getHours();
      const dayOfMonth = now.getDate();
      const month = now.getMonth() + 1; // JavaScript月份从0开始
      const dayOfWeek = now.getDay() || 7; // JavaScript星期日是0，转为7

      // 检查每个组件是否匹配
      return (
        this.matches(parts[0], minute) &&
        this.matches(parts[1], hour) &&
        this.matches(parts[2], dayOfMonth) &&
        this.matches(parts[3], month) &&
        this.matches(parts[4], dayOfWeek)
      );
    } catch (error) {
      logger.error(`解析Cron表达式失败: ${cronExpression}`, error);
      return false;
    }
  }

  /**
   * 检查特定组件是否匹配
   * @param pattern 组件模式
   * @param value 当前值
   * @returns 是否匹配
   */
  private static matches(pattern: string, value: number): boolean {
    // 如果是 *，匹配任何值
    if (pattern === '*') return true;

    // 如果是逗号分隔的值列表
    if (pattern.includes(',')) {
      return pattern.split(',').some(part => this.matches(part, value));
    }

    // 如果是范围 (例如 1-5)
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      return value >= start && value <= end;
    }

    // 如果是间隔 (例如 */5)
    if (pattern.includes('/')) {
      const [_, step] = pattern.split('/');
      return value % Number(step) === 0;
    }

    // 普通数字
    return Number(pattern) === value;
  }

  /**
   * 获取下一次执行的时间差（秒）
   * @param cronExpression Cron表达式
   * @returns 下一次执行的秒数
   */
  static getNextExecutionDelay(cronExpression: string): number {
    // 简单实现：每分钟检查一次
    return 60 * 1000;
  }

  /**
   * 格式化cron表达式为人类可读形式
   * @param cronExpression Cron表达式
   * @returns 人类可读的描述
   */
  static getReadableDescription(cronExpression: string): string {
    if (!cronExpression) return '无效的调度表达式';

    try {
      const parts = cronExpression.split(' ');
      if (parts.length !== 5) return '无效的调度表达式';

      // 常见模式的特殊处理
      if (cronExpression === '0 * * * *') return '每小时';
      if (cronExpression === '0 0 * * *') return '每天午夜';
      if (cronExpression === '0 12 * * *') return '每天中午';
      if (cronExpression === '0 0 * * 1') return '每周一';
      if (cronExpression === '0 0 1 * *') return '每月1日';

      // 基础描述
      return `调度: ${parts[0]}分 ${parts[1]}时 ${parts[2]}日 ${parts[3]}月 ${parts[4]}星期`;
    } catch (error) {
      return '无效的调度表达式';
    }
  }
}

/**
 * 调度器服务类
 */
export class SchedulerService {
  private posting: PostingService;
  private storage: StorageService;
  private user: UserService;
  private chain: ChainService;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private config: SchedulerConfig = {
    enabled: false,
    interval: 3600, // 默认每小时
    enabledChains: [],
    ensLabels: [],
    walletIndices: [],
    cronExpression: '0 * * * *', // 默认每小时执行一次
    useRandomContent: true,
    startTime: null,
    endTime: null
  };
  private status: SchedulerStatus = {
    isRunning: false,
    nextRunTime: null,
    lastRunTime: null,
    lastRunResult: null
  };

  /**
   * 构造函数
   */
  constructor(options: SchedulerServiceOptions) {
    this.posting = options.posting;
    this.storage = options.storage;
    this.user = options.user;
    this.chain = options.chain;

    // 尝试加载配置
    this.loadConfig();
    
    // 初始化后进行首次定时器设置
    this.setupTimer();

    // 定期检查调度时间（每分钟）
    setInterval(() => this.checkSchedule(), 60 * 1000);
  }

  /**
   * 加载调度器配置
   */
  private loadConfig(): void {
    try {
      const admin = this.storage.getUserData('admin');
      if (admin && admin.settings && admin.settings.scheduler) {
        this.config = {
          ...this.config,
          ...admin.settings.scheduler
        };
        logger.info('调度器配置加载成功');
      } else {
        logger.info('未找到调度器配置，使用默认设置');
      }

      // 确保有合理的默认值
      if (!this.config.cronExpression) {
        this.config.cronExpression = '0 * * * *'; // 默认每小时
      }
    } catch (error) {
      logger.error('加载调度器配置失败', error);
    }
  }

  /**
   * 保存调度器配置
   */
  private async saveConfig(): Promise<void> {
    try {
      const admin = this.storage.getUserData('admin');
      if (admin) {
        if (!admin?.settings) {
          admin.settings = {
            currentChain: config.DEFAULT_CHAIN,
            defaultPrompt: ''
          };
        }
        admin.settings.scheduler = this.config;
        await this.storage.setUserData('admin', admin);
        logger.info('调度器配置保存成功');
      }
    } catch (error) {
      logger.error('保存调度器配置失败', error);
    }
  }

  /**
   * 设置定时器
   */
  private setupTimer(): void {
    // 清除现有定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // 如果启用了调度器，设置定时器
    if (this.config.enabled) {
      // 使用固定间隔检查，而不是直接设置下一次执行
      this.timer = setInterval(() => this.checkSchedule(), 60 * 1000);
      
      // 更新状态
      this.status.isRunning = true;
      this.updateNextRunTime();
      
      logger.info(`调度器已启动，使用Cron表达式: ${this.config.cronExpression}`);
      logger.info(`下一次可能执行时间: ${this.status.nextRunTime}`);
    } else {
      this.status.isRunning = false;
      this.status.nextRunTime = null;
      logger.info('调度器已停止');
    }
  }

  /**
   * 更新下一次执行时间
   */
  private updateNextRunTime(): void {
    // 使用简单方式计算下一次运行时间
    const now = new Date();
    // 简单地将nextRunTime设置为下一分钟
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    this.status.nextRunTime = nextMinute;
  }

  /**
   * 检查是否应该执行调度任务
   */
  private async checkSchedule(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const now = new Date();
      
      // 检查时间范围限制
      if (this.config.startTime && now < new Date(this.config.startTime)) {
        return; // 还没到开始时间
      }
      
      if (this.config.endTime && now > new Date(this.config.endTime)) {
        // 已经超过结束时间，自动停止调度器
        await this.stop();
        logger.info('已达到调度结束时间，调度器已自动停止');
        return;
      }

      // 检查当前时间是否匹配Cron表达式
      if (CronParser.isTimeMatching(this.config.cronExpression)) {
        // 执行发布任务
        logger.info('触发定时发布任务');
        await this.runSchedule();
      }
      
      // 更新下一次可能的执行时间
      this.updateNextRunTime();
    } catch (error) {
      logger.error('检查调度时间失败', error);
    }
  }

  /**
   * 启动调度器
   */
  async start(config?: Partial<SchedulerConfig>): Promise<boolean> {
    try {
      // 更新配置
      if (config) {
        this.config = {
          ...this.config,
          ...config,
          enabled: true
        };
      } else {
        this.config.enabled = true;
      }

      // 保存配置
      await this.saveConfig();

      // 设置定时器
      this.setupTimer();

      return true;
    } catch (error) {
      logger.error('启动调度器失败', error);
      return false;
    }
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<boolean> {
    try {
      // 更新配置
      this.config.enabled = false;

      // 保存配置
      await this.saveConfig();

      // 清除定时器
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }

      // 更新状态
      this.status.isRunning = false;
      this.status.nextRunTime = null;

      logger.info('调度器已停止');
      return true;
    } catch (error) {
      logger.error('停止调度器失败', error);
      return false;
    }
  }

  /**
   * 执行调度任务
   */
  private async runSchedule(): Promise<void> {
    if (!this.config.enabled) return;

    // 记录执行时间
    this.lastRunTime = new Date();
    this.status.lastRunTime = this.lastRunTime;

    logger.info(`开始执行调度任务，时间: ${this.lastRunTime}`);

    try {
      // 获取可用标签
      const ensLabels = this.config.ensLabels.length > 0
        ? this.config.ensLabels
        : ['default']; // 默认使用default标签

      // 获取可用链
      const enabledChains = this.config.enabledChains.length > 0
        ? this.config.enabledChains
        : [this.storage.getDefaultChain()];

      // 获取钱包索引
      const walletIndices = this.config.walletIndices.length > 0
        ? this.config.walletIndices
        : [1]; // 默认使用第一个钱包

      // 为每个标签-链-钱包组合发布内容
      for (const ensLabel of ensLabels) {
        for (const chainName of enabledChains) {
          for (const walletIndex of walletIndices) {
            try {
              // 切换到目标链 - 使用setCurrentChain方法替代switchChain
              await this.chain.setCurrentChain(chainName, 'admin');

              // 选择内容发布
              if (this.config.useRandomContent) {
                // 随机选择内容 - 使用现有方法替代postRandomContent
                const contents = this.storage.getContents('admin', ensLabel);
                if (contents && contents.length > 0) {
                  // 随机选择一个内容
                  const randomIndex = Math.floor(Math.random() * contents.length);
                  const randomContent = contents[randomIndex];
                  // 使用现有的发布方法
                  await this.posting.publishContent(
                    ensLabel, 
                    randomContent.id, 
                    walletIndex, 
                    'admin'
                  );
                } else {
                  logger.warn(`没有可用的${ensLabel}标签内容可发布，将生成新内容`);
                  // 如果没有可用内容，生成并发布
                  const result = await this.posting.quickPublish(
                    ensLabel,
                    '',
                    walletIndex,
                    'admin'
                  );
                  logger.info(`为调度任务生成并发布了新内容: ${result.contentId}`);
                }
              } else {
                // 生成新内容并发布 - 使用quickPublish替代generateAndPost
                const result = await this.posting.quickPublish(
                  ensLabel,
                  '',
                  walletIndex,
                  'admin'
                );
                logger.info(`为调度任务生成并发布了新内容: ${result.contentId}`);
              }
            } catch (error) {
              logger.error(`调度任务发布失败: 标签=${ensLabel}, 链=${chainName}, 钱包=${walletIndex}`, error);
            }
          }
        }
      }

      // 更新状态
      this.status.lastRunResult = {
        success: true,
        message: `成功执行调度任务: ${ensLabels.length}个标签, ${enabledChains.length}个链, ${walletIndices.length}个钱包`
      };

      logger.info(`调度任务执行完成，时间: ${new Date()}`);
    } catch (error) {
      // 更新状态
      this.status.lastRunResult = {
        success: false,
        message: `调度任务执行失败: ${error instanceof Error ? error.message : String(error)}`
      };

      logger.error('调度任务执行失败', error);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    return {
      ...this.status,
      isRunning: this.config.enabled,
      // 添加可读的cron描述
      cronDescription: CronParser.getReadableDescription(this.config.cronExpression)
    };
  }

  /**
   * 获取调度器配置
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 更新调度器配置
   */
  async updateConfig(config: Partial<SchedulerConfig>): Promise<boolean> {
    try {
      const wasEnabled = this.config.enabled;
      const cronChanged = config.cronExpression && config.cronExpression !== this.config.cronExpression;

      // 更新配置
      this.config = {
        ...this.config,
        ...config
      };

      // 保存配置
      await this.saveConfig();

      // 如果启用状态改变或cron表达式改变，重新设置定时器
      if (wasEnabled !== this.config.enabled || cronChanged) {
        this.setupTimer();
      }

      // 如果启用了调度器，立即更新下一次执行时间
      if (this.config.enabled) {
        this.updateNextRunTime();
      }

      return true;
    } catch (error) {
      logger.error('更新调度器配置失败', error);
      return false;
    }
  }
} 