/**
 * 社区发帖机器人主入口文件
 */
import config from './config/index.js';
import { initServices } from './services/index.js';
import { initCommandRouter } from './commands/index.js';
import { PlatformManager } from './platforms/platform-manager.js';
import { TelegramPlatform } from './platforms/telegram-platform.js';
import { ApiPlatform } from './platforms/api-platform.js';
import logger from './utils/logger.js';

/**
 * 启动应用
 */
async function start() {
  try {
    logger.initFromConfig(config);
    
    logger.info(`正在启动社区发帖机器人 v${config.VERSION}...`);
    
    // 初始化服务
    const services = await initServices(config);
    logger.info('服务初始化完成');
    
    // 初始化命令路由器
    const commandRouter = initCommandRouter(services);
    logger.info('命令路由器初始化完成');
    
    // 初始化平台管理器
    const platformManager = new PlatformManager(services, commandRouter);
    
    // 注册平台
    // platformManager.register(new CliPlatform());
    
    // 如果配置了Telegram令牌，注册Telegram平台
    if (config.TELEGRAM_TOKEN) {
      platformManager.register(new TelegramPlatform());
    }
    
    // 注册API平台
    platformManager.register(new ApiPlatform());
    
    // 初始化所有平台
    await platformManager.initAll();
    
    // 启动CLI平台（如果是通过CLI运行）
    if (process.argv[1].includes('cli')) {
      await platformManager.start('cli');
    } 
    // 启动Telegram平台（如果配置了令牌）
    else if (config.TELEGRAM_TOKEN) {
      await platformManager.start('telegram');
      // 同时启动API平台，以便通过API访问
      await platformManager.start('api');
    }
    // 默认启动API平台
    else {
      await platformManager.start('api');
    }
    
    // 向控制台打印欢迎信息
    console.log('\n============================================');
    console.log(`🚀 社区发帖机器人 v${config.VERSION} 已启动`);
    console.log('📂 数据目录:', config.DATA_DIR);
    console.log('🌐 API地址:', config.BASE_URL);
    console.log('🔑 令牌:', config.TELEGRAM_TOKEN);
    console.log('============================================\n');
    
    // 保持进程运行
    process.on('SIGINT', async () => {
      logger.info('正在关闭社区发帖机器人...');
      // 关闭所有平台
      for (const platform of platformManager.getAll()) {
        if (platform.stop) {
          await platform.stop();
        }
      }
      process.exit(0);
    });
  } catch (error) {
    logger.error('启动失败', error);
    process.exit(1);
  }
}

// 启动应用
start(); 