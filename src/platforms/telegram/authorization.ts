/**
 * Telegram授权模块
 * 负责处理Telegram用户授权和身份映射
 */
import { logger } from '../../utils/logger.js';
import { Context } from 'telegraf';
import { CommandContext } from '../../types/commands.js';
import { isTelegramAdmin, getTelegramUserId } from '../../utils/admin-check.js';

/**
 * Telegram授权模块
 */
export class TelegramAuthorization {
  /**
   * 检查用户是否在授权白名单中
   */
  public checkAuthorization(telegramUserId: string): boolean {
    // 使用admin-check工具检查Telegram ID
    const isAuthorized = isTelegramAdmin(telegramUserId);
    
    if (!isAuthorized) {
      logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
    }
    
    return isAuthorized;
  }

  /**
   * 获取映射的系统用户ID
   */
  public getMappedUserId(telegramUserId: string): string {
    // 使用admin-check工具获取用户ID
    return getTelegramUserId(telegramUserId);
  }

  /**
   * 创建用户上下文
   */
  public createUserContext(ctx: Context): CommandContext & Record<string, any> {
    const telegramUserId = ctx.from?.id.toString() || '';

    // 从admin-check获取系统用户ID
    const systemUserId = this.getMappedUserId(telegramUserId);

    const username = [
      ctx.from?.first_name,
      ctx.from?.last_name
    ].filter(Boolean).join(' ') || ctx.from?.username || 'Unknown';

    return {
      userId: systemUserId,    // 使用映射后的系统用户ID
      telegramUserId,          // 保存原始的Telegram用户ID
      username,
      platform: 'telegram',
      telegramContext: ctx     // 提供Telegram上下文，以便命令可以直接访问
    };
  }
} 