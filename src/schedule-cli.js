#!/usr/bin/env node

/**
 * CLI工具 - 用于执行发布操作
 * 主要用于GitHub Actions中的定时任务执行
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
  .name('np-post-bot-cli')
  .description('社区发布机器人命令行工具')
  .version('1.0.0');

// 添加内容发布命令
program
  .command('content')
  .description('内容相关操作')
  .option('publish', '发布内容')
  .option('--community <community>', '目标社区')
  .option('--contentType <type>', '内容类型', 'default')
  .option('--useCache', '是否使用缓存内容列表', false)
  .action(async (options) => {
    // 初始化服务
    const initialized = await initServices();
    if (!initialized) {
      process.exit(1);
    }
    
    try {
      if (options.publish) {
        if (!options.community) {
          logger.error('缺少必要参数: community');
          process.exit(1);
        }
        
        logger.info(`正在发布内容到社区 ${options.community}，类型: ${options.contentType}，使用缓存: ${options.useCache ? '是' : '否'}`);
        
        // 执行发布命令
        const result = await commandRouter.route('content.publish', {
          community: options.community,
          contentType: options.contentType,
          useCache: options.useCache
        }, {
          userId: 'scheduler',
          role: 'admin',
          username: 'Scheduler'
        });
        
        if (result.success) {
          logger.info('发布成功:', result.message);
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        } else {
          logger.error('发布失败:', result.message);
          console.error(JSON.stringify(result, null, 2));
          process.exit(1);
        }
      } else {
        logger.error('未指定操作类型');
        process.exit(1);
      }
    } catch (error) {
      logger.error('执行过程中出错:', error);
      process.exit(1);
    }
  });

// 添加调度任务执行命令
program
  .command('schedule')
  .description('调度任务相关操作')
  .option('execute', '执行调度任务')
  .option('--taskId <id>', '任务ID')
  .action(async (options) => {
    // 初始化服务
    const initialized = await initServices();
    if (!initialized) {
      process.exit(1);
    }
    
    try {
      if (options.execute) {
        if (!options.taskId) {
          logger.error('缺少必要参数: taskId');
          process.exit(1);
        }
        
        logger.info(`正在执行调度任务 ${options.taskId}`);
        
        // 执行任务
        const result = await commandRouter.route('scheduler.execute_task', {
          id: options.taskId
        }, {
          userId: 'scheduler',
          role: 'admin',
          username: 'Scheduler'
        });
        
        if (result.success) {
          logger.info('任务执行成功:', result.message);
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        } else {
          logger.error('任务执行失败:', result.message);
          console.error(JSON.stringify(result, null, 2));
          process.exit(1);
        }
      } else {
        logger.error('未指定操作类型');
        process.exit(1);
      }
    } catch (error) {
      logger.error('执行过程中出错:', error);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(); 