#!/usr/bin/env node

/**
 * 钱包CLI工具 - 用于执行钱包相关操作
 * 主要用于在重新部署前保护资产
 */
import { program } from 'commander';
import { ServiceContainer } from './services/service-container.js';
import { CommandRouter } from './commands/command-router.js';
import logger from './utils/logger.js';

// 创建服务容器和命令路由器
const services = new ServiceContainer();
const commandRouter = new CommandRouter(services);

// 初始化服务
async function initServices() {
  try {
    // 初始化必要的服务
    await services.init();
    logger.info('服务初始化成功');
    return true;
  } catch (error) {
    logger.error('服务初始化失败:', error);
    return false;
  }
}

// 定义CLI命令
program
  .name('np-wallet-cli')
  .description('钱包工具')
  .version('1.0.0');

// 添加批量资金转移命令
program
  .command('transfer-all')
  .description('将所有钱包资产转移到安全地址')
  .option('--targetAddress <address>', '目标安全地址')
  .option('--minAmount <amount>', '最小转账金额(ETH)，默认0.001')
  .action(async (options) => {
    // 初始化服务
    const initialized = await initServices();
    if (!initialized) {
      process.exit(1);
    }
    
    try {
      if (!options.targetAddress) {
        logger.error('缺少必要参数: targetAddress');
        process.exit(1);
      }
      
      logger.info(`开始将所有钱包资产转移到安全地址: ${options.targetAddress}`);
      
      // 执行转移命令
      const result = await commandRouter.route('wallet.transfer_all', {
        targetAddress: options.targetAddress,
        minAmount: options.minAmount
      }, {
        userId: 'admin',
        role: 'admin',
        username: 'Admin'
      });
      
      if (result.success) {
        logger.info('批量资金转移成功:', result.message);
        console.log(JSON.stringify(result.data, null, 2));
        process.exit(0);
      } else {
        logger.error('批量资金转移失败:', result.message);
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
    } catch (error) {
      logger.error('执行过程中出错:', error);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(); 