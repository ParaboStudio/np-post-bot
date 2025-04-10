/**
 * 日志工具类
 */

// 确保TypeScript识别Node.js的console对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const console: { 
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

// 日志级别定义
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 日志配置接口
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableTimestamp: boolean;
  timestampFormat: (date: Date) => string;
}

/**
 * 日志管理类
 */
class Logger {
  private config: LoggerConfig;
  private readonly LEVEL_PRIORITY = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  constructor() {
    // 使用默认配置
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableTimestamp: true,
      timestampFormat: (date: Date) => date.toISOString(),
    };
  }

  /**
   * 配置日志工具
   * @param config 配置选项
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取格式化的时间戳
   */
  private getTimestamp(): string {
    if (!this.config.enableTimestamp) return '';
    const timestamp = this.config.timestampFormat(new Date());
    return `[${timestamp}] `;
  }

  /**
   * 检查是否应该记录该级别的日志
   * @param level 日志级别
   */
  private shouldLog(level: LogLevel): boolean {
    return this.LEVEL_PRIORITY[level] >= this.LEVEL_PRIORITY[this.config.level];
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param args 其他参数
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    if (this.config.enableConsole) {
      // eslint-disable-next-line no-console
      console.debug(`${this.getTimestamp()}[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param args 其他参数
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    if (this.config.enableConsole) {
      // eslint-disable-next-line no-console
      console.info(`${this.getTimestamp()}[INFO] ${message}`, ...args);
    }
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param args 其他参数
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    if (this.config.enableConsole) {
      // eslint-disable-next-line no-console
      console.warn(`${this.getTimestamp()}[WARN] ${message}`, ...args);
    }
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param args 其他参数
   */
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    if (this.config.enableConsole) {
      // eslint-disable-next-line no-console
      console.error(`${this.getTimestamp()}[ERROR] ${message}`, ...args);
    }
  }

  // 提供初始化方法
  initFromConfig(configModule: any): void {
    if (configModule?.LOG_LEVEL) {
      this.config.level = configModule.LOG_LEVEL;
    }
  }
}

// 导出单例实例
export const logger = new Logger();
export default logger;