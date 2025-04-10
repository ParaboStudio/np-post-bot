/**
 * 用户命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * 用户命令模块
 */
export class UserCommands implements CommandModule {
  public name = 'user';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('user.add', this.addUser);
    router.registerHandler('user.list', this.listUsers);
    router.registerHandler('user.delete', this.deleteUser);
    router.registerHandler('user.switch', this.switchUser);
  }

  /**
   * 添加用户
   */
  private addUser: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.username) {
        return {
          success: false,
          message: '缺少用户名参数'
        };
      }

      // 添加用户
      const storageService = services.storage;
      
      // 创建用户数据
      const userData = {
        username: args.username,
        role: 'user' as 'user' | 'admin',  // 显式类型转换
        wallets: [],
        contents: {},
        settings: {
          currentChain: config.DEFAULT_CHAIN,
          defaultPrompt: '写一篇关于社区的文章，描述它的特点和价值'
        },
        history: []
      };
      
      // 保存用户数据
      await storageService.setUserData(args.username, userData);
      
      // 如果提供了私钥，也添加钱包
      if (args.privateKey) {
        // 使用ethers创建钱包并获取地址
        const wallet = new ethers.Wallet(args.privateKey);
        const address = wallet.address;
        
        await storageService.addWallet(args.username, args.privateKey, address);
      }

      return {
        success: true,
        message: '用户添加成功',
        data: userData
      };
    } catch (error) {
      logger.error('添加用户失败', error);
      return {
        success: false,
        message: `添加用户失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 列出用户
   */
  private listUsers: CommandHandler = async ({ services }) => {
    try {
      const storageService = services.storage;
      const users = storageService.getUsers();

      return {
        success: true,
        message: '获取用户列表成功',
        data: users.map(username => {
          const userData = storageService.getUserData(username);
          return {
            username,
            role: userData?.role || 'user',
            wallets: userData?.wallets?.length || 0,
            contents: Object.keys(userData?.contents || {}).length
          };
        })
      };
    } catch (error) {
      logger.error('获取用户列表失败', error);
      return {
        success: false,
        message: `获取用户列表失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 删除用户
   */
  private deleteUser: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.username) {
        return {
          success: false,
          message: '缺少用户名参数'
        };
      }

      // 暂时没有删除用户的方法，只能返回失败
      return {
        success: false,
        message: '删除用户功能暂未实现'
      };
    } catch (error) {
      logger.error('删除用户失败', error);
      return {
        success: false,
        message: `删除用户失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 切换当前用户
   */
  private switchUser: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.username) {
        return {
          success: false,
          message: '缺少用户名参数'
        };
      }

      const userService = services.user;
      const success = await userService.switchUser(args.username);

      return {
        success,
        message: success ? `已切换到用户 ${args.username}` : '切换用户失败'
      };
    } catch (error) {
      logger.error('切换用户失败', error);
      return {
        success: false,
        message: `切换用户失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 