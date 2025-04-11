/**
 * 钱包命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import { ethers } from 'ethers';
import logger from '../utils/logger.js';

/**
 * 钱包命令模块
 */
export class WalletCommands implements CommandModule {
  public name = 'wallet';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('wallet.add', this.addWallet);
    router.registerHandler('wallet.list', this.listWallets);
    router.registerHandler('wallet.delete', this.deleteWallet);
    router.registerHandler('wallet.switch', this.switchWallet);
    router.registerHandler('wallet.generate', this.generateWallets);
  }

  /**
   * 添加钱包
   */
  private addWallet: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.privateKey) {
        return {
          success: false,
          message: '缺少私钥参数'
        };
      }

      // 添加钱包
      const storageService = services.storage;
      const userService = services.user;
      
      // 获取当前用户
      const user = userService.getCurrentUser();
      
      // 使用ethers创建钱包并获取地址
      const wallet = new ethers.Wallet(args.privateKey);
      const address = wallet.address;
      
      // 添加钱包
      const result = await storageService.addWallet(user, args.privateKey, address);

      return {
        success: true,
        message: '钱包添加成功',
        data: result
      };
    } catch (error) {
      logger.error('添加钱包失败', error);
      return {
        success: false,
        message: `添加钱包失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 列出钱包
   */
  private listWallets: CommandHandler = async ({ services }) => {
    try {
      const storageService = services.storage;
      const userService = services.user;
      
      // 获取当前用户
      const user = userService.getCurrentUser();
      
      // 获取用户的所有钱包
      const wallets = storageService.getWallets(user);

      return {
        success: true,
        message: '获取钱包列表成功',
        data: wallets
      };
    } catch (error) {
      logger.error('获取钱包列表失败', error);
      return {
        success: false,
        message: `获取钱包列表失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 删除钱包
   */
  private deleteWallet: CommandHandler = async ({ services, args }) => {
    try {
      if (args.index === undefined) {
        return {
          success: false,
          message: '缺少钱包索引参数'
        };
      }

      const storageService = services.storage;
      const userService = services.user;
      
      // 获取当前用户
      const user = userService.getCurrentUser();
      
      // 删除钱包
      const success = await storageService.deleteWallet(user, args.index);

      return {
        success,
        message: success ? '钱包删除成功' : '钱包删除失败'
      };
    } catch (error) {
      logger.error('删除钱包失败', error);
      return {
        success: false,
        message: `删除钱包失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 切换当前钱包
   */
  private switchWallet: CommandHandler = async ({ services, args }) => {
    try {
      if (args.index === undefined) {
        return {
          success: false,
          message: '缺少钱包索引参数'
        };
      }

      const userService = services.user;
      const storageService = services.storage;
      
      // 获取当前用户
      const user = userService.getCurrentUser();
      
      // 更新用户设置
      const settings = storageService.getUserSettings(user) || {};
      const success = await storageService.updateUserSettings(user, {
        ...settings,
        currentWallet: args.index
      });

      return {
        success: !!success,
        message: success ? `已切换到钱包 ${args.index}` : '切换钱包失败'
      };
    } catch (error) {
      logger.error('切换钱包失败', error);
      return {
        success: false,
        message: `切换钱包失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 生成HD钱包
   */
  private generateWallets: CommandHandler = async ({ services, args }) => {
    try {
      // 获取参数
      const count = args.count ? parseInt(args.count) : 20;
      const mnemonic = args.mnemonic;
      
      // 参数验证
      if (count <= 0 || count > 100) {
        return {
          success: false,
          message: '无效的钱包数量，请指定1-100之间的数值'
        };
      }
      
      // 如果提供了助记词，验证其有效性
      if (mnemonic) {
        try {
          ethers.utils.HDNode.fromMnemonic(mnemonic);
        } catch (e) {
          return {
            success: false,
            message: '无效的助记词'
          };
        }
      }
      
      // 调用钱包服务生成钱包
      const result = await services.wallet.generateHDWallets(count, mnemonic);
      
      return {
        success: true,
        message: `成功生成${result.wallets.length}个钱包`,
        data: {
          mnemonic: result.mnemonic,
          wallets: result.wallets.map(w => ({
            id: w.id,
            address: w.address,
            createdAt: w.createdAt
          })),
          warning: '请务必保存助记词，这是恢复钱包的唯一方式！'
        }
      };
    } catch (error) {
      logger.error('生成HD钱包失败', error);
      return {
        success: false,
        message: `生成HD钱包失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 