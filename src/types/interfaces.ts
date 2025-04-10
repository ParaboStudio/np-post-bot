/**
 * 接口相关类型定义
 */
import { Config } from './config.js';
import { CommandRouter } from '../commands/command-router.js';

/**
 * Bot适配器接口
 */
export interface BotAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Telegram消息处理配置
 */
export interface TelegramHandlerConfig {
  router: CommandRouter;
  config: Config;
}

/**
 * Lark消息处理配置
 */
export interface LarkHandlerConfig {
  router: CommandRouter;
  config: Config;
}

/**
 * CLI适配器配置
 */
export interface CLIAdapterConfig {
  router: CommandRouter;
} 