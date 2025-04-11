/**
 * 资金相关命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import { ethers } from 'ethers';
import logger from '../utils/logger.js';

/**
 * 资金命令模块
 */
export class FundCommands implements CommandModule {
  public name = 'fund';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('fund.send', this.handleSend);
    router.registerHandler('fund.distribute', this.handleDistribute);
    router.registerHandler('fund.batch_eth', this.handleBatchEth);
    router.registerHandler('fund.balance', this.handleBalance);
  }

  /**
   * 发送资金
   */
  private handleSend: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.toAddress) {
        return {
          success: false,
          message: '缺少接收地址参数'
        };
      }

      if (!args.amount) {
        return {
          success: false,
          message: '缺少金额参数'
        };
      }

      // 验证地址格式
      if (!ethers.utils.isAddress(args.toAddress)) {
        return {
          success: false,
          message: '无效的接收地址格式'
        };
      }

      // 获取钱包索引
      const walletIndex = args.walletIndex !== undefined ? parseInt(args.walletIndex) : undefined;

      // 获取钱包服务
      const walletService = services.wallet;
      
      // 执行转账操作
      const result = await walletService.sendFunds(
        args.toAddress,
        args.amount,
        walletIndex
      );

      return {
        success: true,
        message: `资金发送成功: ${args.amount} ETH 已发送到 ${args.toAddress}`,
        data: {
          txHash: result.txHash,
          from: result.from,
          to: args.toAddress,
          amount: args.amount,
          gasUsed: result.gasUsed
        }
      };
    } catch (error) {
      logger.error('发送资金失败', error);
      return {
        success: false,
        message: `发送资金失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 向多个钱包分发资金
   */
  private handleDistribute: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.amount) {
        return {
          success: false,
          message: '缺少金额参数'
        };
      }

      // 获取钱包列表
      const walletIndices = args.walletIndices || [];
      
      // 验证参数
      if (!Array.isArray(walletIndices) || walletIndices.length === 0) {
        return {
          success: false,
          message: '未指定目标钱包，请提供钱包索引列表'
        };
      }

      // 获取钱包服务
      const walletService = services.wallet;
      
      // 执行批量分发
      const result = await walletService.distributeFunds(
        args.amount,
        walletIndices
      );

      // 统计成功和失败的数量
      const successCount = result.transfers.filter(t => t.success).length;
      const failCount = result.transfers.length - successCount;
      
      return {
        success: true,
        message: `资金分发完成: ${successCount}成功，${failCount}失败，每个钱包 ${args.amount} ETH`,
        data: {
          totalTransferred: (parseFloat(args.amount) * successCount).toFixed(6),
          successCount,
          failCount,
          transfers: result.transfers
        }
      };
    } catch (error) {
      logger.error('资金分发失败', error);
      return {
        success: false,
        message: `资金分发失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 批量打ETH到钱包
   */
  private handleBatchEth: CommandHandler = async ({ services, args }) => {
    try {
      if (!args.amount) {
        return {
          success: false,
          message: '缺少金额参数'
        };
      }

      // 获取钱包列表
      const walletList = args.walletList || [];
      
      // 验证参数
      if (!Array.isArray(walletList) || walletList.length === 0) {
        return {
          success: false,
          message: '未指定目标钱包，请提供钱包地址或索引列表'
        };
      }

      // 获取当前用户
      const userService = services.user;
      const user = userService.getCurrentUser();
      
      // 获取钱包服务
      const walletService = services.wallet;
      
      // 执行批量打ETH操作
      const result = await walletService.batchSendEth(
        args.amount,
        walletList,
        user
      );

      // 统计成功和失败的数量
      const successCount = result.transfers.filter(t => t.success).length;
      const failCount = result.transfers.length - successCount;
      
      return {
        success: true,
        message: `批量打ETH完成: ${successCount}成功，${failCount}失败，每个钱包 ${args.amount} ETH`,
        data: {
          totalTransferred: (parseFloat(args.amount) * successCount).toFixed(6),
          successCount,
          failCount,
          transfers: result.transfers
        }
      };
    } catch (error) {
      logger.error('批量打ETH失败', error);
      return {
        success: false,
        message: `批量打ETH失败: ${(error as Error).message || String(error)}`
      };
    }
  };

  /**
   * 查询钱包余额
   */
  private handleBalance: CommandHandler = async ({ services, args }) => {
    try {
      // 获取钱包索引
      const walletIndex = args.walletIndex !== undefined ? parseInt(args.walletIndex) : undefined;

      // 获取钱包服务
      const walletService = services.wallet;
      
      // 获取链服务
      const chainService = services.chain;
      const chainConfig = chainService.getCurrentChainConfig();
      
      // 执行余额查询
      const result = await walletService.getWalletBalance(
        walletIndex,
        chainConfig.rpcUrl
      );

      // 格式化输出
      const balanceEth = ethers.utils.formatEther(result.balance);
      
      return {
        success: true,
        message: `钱包余额: ${balanceEth} ETH`,
        data: {
          address: result.address,
          balance: balanceEth,
          balanceWei: result.balance.toString(),
          walletIndex: result.walletIndex,
          chain: chainConfig.name
        }
      };
    } catch (error) {
      logger.error('查询钱包余额失败', error);
      return {
        success: false,
        message: `查询钱包余额失败: ${(error as Error).message || String(error)}`
      };
    }
  };
} 