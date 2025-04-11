/**
 * 区块链相关命令处理器
 */
import { CommandModule, CommandHandler, CommandResult } from '../types/index.js';
import { CommandRouter } from './command-router.js';
import logger from '../utils/logger.js';

/**
 * 区块链命令模块
 */
export class ChainCommands implements CommandModule {
  public name = 'chain';

  /**
   * 注册命令处理器
   */
  public register(router: CommandRouter): void {
    router.registerHandler('chain.info', this.handleInfo);
  }

  /**
   * 显示当前链信息
   */
  private handleInfo: CommandHandler = async ({ services }) => {
    try {
      // 获取链服务
      const chainService = services.chain;
      
      // 获取当前链配置
      const currentChain = chainService.getCurrentChainConfig();
      
      if (!currentChain) {
        return {
          success: false,
          message: '当前未设置链配置'
        };
      }

      return {
        success: true,
        message: `当前链: ${currentChain.name}\nRPC URL: ${currentChain.rpcUrl}\n合约地址: ${currentChain.contractAddress || '未设置'}`,
        data: {
          name: currentChain.name,
          rpcUrl: currentChain.rpcUrl,
          contractAddress: currentChain.contractAddress
        }
      };
    } catch (error) {
      logger.error('获取当前链信息失败', error);
      return {
        success: false,
        message: `获取当前链信息失败: ${(error as Error).message || String(error)}`
      };
    }
  };
}