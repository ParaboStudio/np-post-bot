/**
 * 社区发帖机器人API入口
 */
import config from './config/index.js';
import { initServices } from './services/index.js';
import { initCommandRouter } from './commands/index.js';
import { PlatformManager } from './platforms/platform-manager.js';
import { ApiPlatform } from './platforms/api-platform.js';
import logger from './utils/logger.js';

/**
 * 启动API服务
 */
async function startApi() {
  try {
    logger.initFromConfig(config);
    
    logger.info(`正在启动社区发帖机器人API v${config.VERSION}...`);
    
    // 初始化服务
    const services = await initServices(config);
    logger.info('服务初始化完成');
    
    // 初始化命令路由器
    const commandRouter = initCommandRouter(services);
    logger.info('命令路由器初始化完成');
    
    // 初始化平台管理器
    const platformManager = new PlatformManager(services, commandRouter);
    
    // 注册API平台
    platformManager.register(new ApiPlatform());
    
    // 初始化所有平台
    await platformManager.initAll();
    
    // 启动API平台
    await platformManager.start('api');
    
    // 向控制台打印欢迎信息
    console.log('\n============================================');
    console.log(`🚀 社区发帖机器人API v${config.VERSION} 已启动`);
    console.log('📂 数据目录:', config.DATA_DIR);
    console.log('🌐 API地址:', config.BASE_URL);
    console.log('============================================\n');
    
    // 保持进程运行
    process.on('SIGINT', async () => {
      logger.info('正在关闭社区发帖机器人API...');
      await platformManager.get('api')?.stop?.();
      process.exit(0);
    });
  } catch (error) {
    logger.error('API启动失败', error);
    process.exit(1);
  }
}

// 启动API
startApi(); 