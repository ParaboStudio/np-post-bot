/**
 * Telegram命令映射模块
 * 负责将Telegram命令映射到内部命令
 */
import { logger } from '../../utils/logger.js';

/**
 * Telegram命令映射
 */
export class TelegramCommandsMap {
  // 命令映射表 - 将Telegram命令映射到内部命令
  private commandMap: Record<string, string> = {
    // 基本命令
    'start': 'start',
    'help': 'help',
    'info': 'info',

    // 内容相关命令
    'generate': 'content.generate',
    'list': 'content.list',
    'content_generate': 'content.generate',
    'content_list': 'content.list',
    'content_add': 'content.add',
    'content_delete': 'content.delete',
    'content_detail': 'content.detail',
    'content_list_detail': 'content.detail',

    // 发布相关命令
    'publish': 'publish.content',
    'quick_publish': 'publish.quick',

    // 钱包相关命令
    'wallet_add': 'wallet.add',
    'wallet_list': 'wallet.list',
    'wallet_delete': 'wallet.delete',
    'wallet_switch': 'wallet.switch',

    // 用户相关命令
    'user_add': 'user.add',
    'user_list': 'user.list',
    'user_delete': 'user.delete',
    'user_switch': 'user.switch',

    // 调度器相关命令
    'scheduler_status': 'scheduler.status',
    'scheduler_start': 'scheduler.start',
    'scheduler_stop': 'scheduler.stop',
    'scheduler_config': 'scheduler.config',
    'scheduler_update': 'scheduler.update',
    
    // 添加新的schedule_命令映射
    'schedule_add': 'scheduler.add_task',
    'schedule_list': 'scheduler.list_tasks',
    'schedule_delete': 'scheduler.delete_task',
    'schedule_enable': 'scheduler.enable_task',
    'schedule_disable': 'scheduler.disable_task',
    'schedule_execute': 'scheduler.execute_task',

    // 系统相关命令
    'system_info': 'system.info',
    'system_diagnose': 'system.diagnose',
    'system_cache': 'system.cache',
    'system_version': 'system.version',
    'system_clear_images': 'system.clear_images'
  };

  /**
   * 将Telegram命令映射到内部命令
   */
  public mapCommand(telegramCommand: string): string | null {
    const command = this.commandMap[telegramCommand];
    if (command) {
      logger.debug(`命令映射: ${telegramCommand} -> ${command}`);
      return command;
    }
    logger.warn(`未找到命令映射: ${telegramCommand}`);
    return null;
  }

  /**
   * 获取所有可用的Telegram命令
   */
  public getAvailableCommands(): string[] {
    return Object.keys(this.commandMap);
  }

  /**
   * 获取Telegram机器人命令列表
   */
  public getBotCommands(): Array<{ command: string; description: string }> {
    return [
      { command: 'start', description: '开始使用机器人' },
      { command: 'help', description: '显示帮助信息' },
      { command: 'content_generate', description: '生成内容 <社区> [提示词]' },
      { command: 'content_list', description: '列出内容 <社区> [序号/ID]' },
      { command: 'publish', description: '发布内容 <社区> <序号> [钱包索引]' },
      { command: 'quick_publish', description: '快速发布 <社区> [文本]' },
      { command: 'wallet_add', description: '添加钱包 <私钥>' },
      { command: 'wallet_list', description: '列出钱包' },
      { command: 'schedule_add', description: '添加调度任务 time=HH:MM community=社区' },
      { command: 'schedule_list', description: '列出所有调度任务' },
      { command: 'scheduler_status', description: '查看调度器状态' },
      { command: 'system_info', description: '显示系统信息' },
      { command: 'system_clear_images', description: '清理图片 [命名模式]' }
    ];
  }
} 