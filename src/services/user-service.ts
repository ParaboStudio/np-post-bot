/**
 * 用户服务 - 管理用户数据和会话
 */
import { StorageService } from './storage-service.js';
import { UserData } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * 用户服务配置
 */
interface UserServiceOptions {
  storage: StorageService;
}

/**
 * 用户服务类
 */
export class UserService {
  private storage: StorageService;
  private currentUser: string = 'admin'; // 默认用户

  /**
   * 构造函数
   */
  constructor(options: UserServiceOptions) {
    this.storage = options.storage;
  }

  /**
   * 获取当前用户
   */
  public getCurrentUser(): string {
    return this.currentUser;
  }

  /**
   * 切换当前用户
   */
  public async switchUser(username: string): Promise<boolean> {
    const userData = this.storage.getUserData(username);
    if (!userData) {
      logger.warn(`尝试切换到不存在的用户: ${username}`);
      return false;
    }

    this.currentUser = username;
    logger.info(`已切换到用户: ${username}`);
    return true;
  }

  /**
   * 获取用户数据
   */
  public getUserData(username: string = this.currentUser): UserData | null {
    return this.storage.getUserData(username);
  }

  /**
   * 获取当前用户的数据
   */
  public getCurrentUserData(): UserData | null {
    return this.storage.getUserData(this.currentUser);
  }

  /**
   * 获取所有用户
   */
  public getUsers(): string[] {
    return this.storage.getUsers();
  }

  /**
   * 更新用户设置
   */
  public async updateUserSettings(settings: any, username: string = this.currentUser): Promise<any> {
    return this.storage.updateUserSettings(username, settings);
  }

  /**
   * 获取用户设置
   */
  public getUserSettings(username: string = this.currentUser): any {
    return this.storage.getUserSettings(username);
  }

  /**
   * 检查用户是否是管理员
   */
  public isAdmin(username: string = this.currentUser): boolean {
    const userData = this.storage.getUserData(username);
    return userData?.role === 'admin';
  }

  /**
   * 验证用户是否有权限执行操作
   */
  public canPerformAction(action: string, username: string = this.currentUser): boolean {
    // 目前所有操作只需要是用户就可以执行
    // 未来可以添加更细粒度的权限控制
    return !!this.storage.getUserData(username);
  }
} 