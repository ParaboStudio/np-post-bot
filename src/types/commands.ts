/**
 * 命令相关类型定义
 */
import { ServiceContainer } from '../services/index.js';

/**
 * 命令上下文
 */
export interface CommandContext {
  userId: string;
  platform?: string;
  platformData?: any;
}

/**
 * 命令处理器参数
 */
export interface CommandHandlerParams {
  services: ServiceContainer;
  args: any;
  context: CommandContext;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * 命令处理器
 */
export type CommandHandler = (params: CommandHandlerParams) => Promise<CommandResult>;

/**
 * 命令模块定义
 */
export interface CommandModule {
  // 模块名称
  name: string;
  
  // 注册命令处理器
  register: (router: any) => void;
}

/**
 * 生成内容参数
 */
export interface GenerateContentParams {
  community: string;
  prompt?: string;
  customPrompt?: string;
  style?: string;
  includeImage?: boolean;
  imageCount?: number;
  imagePrompt?: string;
}

/**
 * 发布内容参数
 */
export interface PublishContentParams {
  community: string;
  text: string;
  images?: string[];
  wallet?: string;
}

/**
 * 快速发布参数
 */
export interface QuickPublishParams {
  community: string;
  prompt?: string;
  customPrompt?: string;
  style?: string;
  includeImage?: boolean;
  imageCount?: number;
  imagePrompt?: string;
  wallet?: string;
}

/**
 * 钱包相关命令参数
 */
export interface WalletCommandParams {
  address?: string;
  name?: string;
  privateKey?: string;
}

/**
 * 社区信息查询参数
 */
export interface CommunityInfoParams {
  community: string;
}

/**
 * 命令定义相关类型
 */

/**
 * 命令参数定义
 */
export interface CommandParam {
  name: string;
  description: string;
  required: boolean;
}

/**
 * 平台特定命令配置
 */
export interface PlatformCommandConfig {
  // 电报平台配置
  telegram?: {
    command: string;
    aliases?: string[];
    specialHandler?: string;
  };
  
  // CLI平台配置
  cli?: {
    command: string;
  };
  
  // API平台配置
  api?: {
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  };
}

/**
 * 统一命令定义
 */
export interface CommandDefinition {
  // 支持的平台及平台特定配置
  platforms: PlatformCommandConfig;
  
  // 命令处理器
  handler: string;
  
  // 命令描述
  description: string;
  
  // 命令参数
  params: CommandParam[];
  
  // 命令分类
  category: string;
}

/**
 * 命令处理参数
 */
export interface CommandParams {
  services: any;
  args: any;
  context: CommandContext;
} 