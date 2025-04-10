#!/usr/bin/env node

/**
 * 社区发帖机器人CLI入口
 */
import config from './config/index.js';
import { initServices } from './services/index.js';
import { initCommandRouter } from './commands/index.js';
import { PlatformManager } from './platforms/platform-manager.js';
import { CliPlatform } from './platforms/cli-platform.js';
import logger from './utils/logger.js';

/**
 * 初始化CLI
 */
async function initCLI() {
  try {
    logger.initFromConfig(config);
    
    // 初始化服务
    logger.info('正在初始化服务...');
    const services = await initServices(config);
    
    // 初始化命令路由
    const commandRouter = initCommandRouter(services);
    
    // 初始化平台管理器
    const platformManager = new PlatformManager(services, commandRouter);
    
    // 注册CLI平台
    const cliPlatform = new CliPlatform();
    platformManager.register(cliPlatform);
    
    // 初始化CLI平台
    await platformManager.initAll();
    
    // 启动CLI平台
    await platformManager.start('cli');
  } catch (error) {
    logger.error('CLI初始化失败', error);
    console.error('❌ CLI初始化失败:', error);
    process.exit(1);
  }
}

// 启动CLI
initCLI(); 