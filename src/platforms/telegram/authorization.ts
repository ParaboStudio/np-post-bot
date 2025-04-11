/**
 * Telegram授权模块
 * 负责处理Telegram用户授权和身份映射
 */
import { logger } from '../../utils/logger.js';
import { Context } from 'telegraf';
import { CommandContext } from '../../types/commands.js';

/**
 * Telegram授权模块
 */
export class TelegramAuthorization {
  // Telegram用户ID白名单 - 将Telegram用户ID映射到系统用户
  private authorizedUsers: Record<string, string> = {
    // 您的Telegram ID映射到admin用户
    '1424003064': 'admin',
    '6157223080': 'admin',
    '471086510': 'admin',
    '1861275146': 'admin',
    // 可以添加更多授权用户
    // '其他TelegramID': 'admin',
    // '另一个TelegramID': '其他系统用户名'
  };

  /**
   * 检查用户是否在授权白名单中
   */
  public checkAuthorization(telegramUserId: string): boolean {
    // 检查用户ID是否在白名单中
    const isAuthorized = telegramUserId in this.authorizedUsers;
    
    if (!isAuthorized) {
      logger.warn(`未授权的用户尝试访问: Telegram ID ${telegramUserId}`);
    }
    
    return isAuthorized;
  }

  /**
   * 获取映射的系统用户ID
   */
  public getMappedUserId(telegramUserId: string): string {
    // 如果用户在白名单中，返回映射的系统用户ID，否则返回'admin'作为默认值
    return this.authorizedUsers[telegramUserId] || 'admin';
  }

  /**
   * 创建用户上下文
   */
  public createUserContext(ctx: Context): CommandContext & Record<string, any> {
    const telegramUserId = ctx.from?.id.toString() || '';

    // 从白名单映射中获取系统用户ID
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