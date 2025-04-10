/**
 * 系统命令
 */
import { CommandModule, CommandResult } from '../types/commands.js';
import { CommandRouter } from './command-router.js';
import { ServiceContainer } from '../services/index.js';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 系统信息命令
 */
export class SystemInfoCommand {
  constructor(private services: ServiceContainer) {}

  async execute(args: any = {}, context: any = {}): Promise<CommandResult> {
    // 获取启动时间
    const uptime = process.uptime();
    const uptimeStr = formatUptime(uptime);
    
    // 获取内存使用
    const memoryUsage = process.memoryUsage();
    const memoryUsageStr = formatBytes(memoryUsage.rss);
    
    // 获取存储使用
    const storageUsage = await getStorageUsage(config.DATA_DIR);
    
    return {
      success: true,
      message: '系统信息获取成功',
      data: {
        version: config.VERSION,
        dataDir: config.DATA_DIR,
        uptime: uptimeStr,
        memory: memoryUsageStr,
        storage: storageUsage,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'development'
      }
    };
  }
}

/**
 * 系统诊断命令
 */
export class SystemDiagnoseCommand {
  constructor(private services: ServiceContainer) {}

  async execute(args: any = {}, context: any = {}): Promise<CommandResult> {
    const checks = [];
    
    // 检查数据目录
    checks.push(await checkDataDirectory(config.DATA_DIR));
    
    // 检查服务状态
    checks.push(checkServices(this.services));
    
    // 检查系统资源
    checks.push(checkSystemResources());
    
    // 返回诊断结果
    return {
      success: true,
      message: '系统诊断完成',
      data: {
        checks,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * 内存缓存管理命令
 */
export class MemoryCacheCommand {
  constructor(private services: ServiceContainer) {}

  async execute(args: any = {}, context: any = {}): Promise<CommandResult> {
    const fileService = this.services.file;
    const action = args.action || 'status';

    switch (action) {
      case 'clear':
        // 清理内存缓存
        fileService.clearCache();
        return {
          success: true,
          message: '内存缓存已清理',
          data: {
            action: 'clear',
            timestamp: new Date().toISOString()
          }
        };
      
      case 'status':
      default:
        // 获取缓存状态
        const memoryUsage = process.memoryUsage();
        return {
          success: true,
          message: '内存缓存状态',
          data: {
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed),
            rss: formatBytes(memoryUsage.rss),
            external: formatBytes(memoryUsage.external),
            arrayBuffers: formatBytes(memoryUsage.arrayBuffers || 0),
            percentageUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + '%'
          }
        };
    }
  }
}

/**
 * 图片清理命令
 */
export class ImageClearCommand {
  constructor(private services: ServiceContainer) {}

  async execute(args: any = {}, context: any = {}): Promise<CommandResult> {
    try {
      // 获取清理命名模式参数
      const pattern = args.pattern || '';
      
      // 获取图片目录
      const imagesDir = path.join(config.DATA_DIR, 'images');
      
      // 检查目录是否存在
      if (!fs.existsSync(imagesDir)) {
        return {
          success: false,
          message: `图片目录不存在: ${imagesDir}`
        };
      }
      
      // 执行清理
      const result = await this.cleanupImages(imagesDir, pattern);
      
      // 构建清理说明
      const description = pattern ? `名称包含 "${pattern}" 的图片文件` : '所有图片文件';
      
      return {
        success: true,
        message: `图片清理完成，删除了${result.count}个文件，释放了${formatBytes(result.size)}空间`,
        data: {
          action: 'clear_images',
          pattern,
          description,
          deleted: {
            count: result.count,
            size: formatBytes(result.size)
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `清理图片文件失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * 清理图片文件
   * @param directory 图片目录
   * @param pattern 可选的文件名过滤模式
   * @returns 清理结果，包含删除的文件数量和释放的空间
   */
  private async cleanupImages(directory: string, pattern: string = ''): Promise<{count: number, size: number}> {
    try {
      let count = 0;
      let size = 0;
      
      // 读取目录中的所有文件
      const files = fs.readdirSync(directory);
      
      // 图片文件扩展名
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      
      // 遍历并清理文件
      for (const file of files) {
        try {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          
          // 只处理文件，不处理目录
          if (!stats.isDirectory()) {
            // 检查是否是图片文件
            const ext = path.extname(file).toLowerCase();
            if (imageExtensions.includes(ext)) {
              // 应用命名模式过滤
              if (!pattern || file.includes(pattern)) {
                // 删除文件并记录大小
                size += stats.size;
                fs.unlinkSync(filePath);
                count++;
              }
            }
          }
        } catch (error) {
          // 继续处理其他文件
        }
      }
      
      return { count, size };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * 系统命令模块
 */
export class SystemCommands implements CommandModule {
  name = 'system';
  
  constructor() {}
  
  register(router: CommandRouter): void {
    // 注册系统信息命令
    router.registerHandler('system.info', ({ services, args, context }) => {
      const command = new SystemInfoCommand(services);
      return command.execute(args, context);
    });
    
    // 注册系统诊断命令
    router.registerHandler('system.diagnose', ({ services, args, context }) => {
      const command = new SystemDiagnoseCommand(services);
      return command.execute(args, context);
    });

    // 注册内存缓存管理命令
    router.registerHandler('system.cache', ({ services, args, context }) => {
      const command = new MemoryCacheCommand(services);
      return command.execute(args, context);
    });

    // 注册图片清理命令
    router.registerHandler('system.clear_images', ({ services, args, context }) => {
      const command = new ImageClearCommand(services);
      return command.execute(args, context);
    });
  }
}

/**
 * 检查数据目录
 */
async function checkDataDirectory(dataDir: string): Promise<any> {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dataDir)) {
      return {
        name: '数据目录',
        status: 'fail',
        message: `数据目录不存在: ${dataDir}`
      };
    }
    
    // 检查权限
    try {
      const testFile = path.join(dataDir, '.test-write');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      return {
        name: '数据目录',
        status: 'fail',
        message: `数据目录权限不足: ${dataDir}`
      };
    }
    
    // 检查子目录
    const requiredDirs = ['users', 'images', 'metadata'];
    for (const dir of requiredDirs) {
      const fullPath = path.join(dataDir, dir);
      if (!fs.existsSync(fullPath)) {
        return {
          name: '数据目录结构',
          status: 'fail',
          message: `缺少必要的子目录: ${dir}`
        };
      }
    }
    
    // 检查磁盘空间
    const storageUsage = await getStorageUsage(dataDir);
    
    return {
      name: '数据目录',
      status: 'pass',
      message: `数据目录正常，存储使用: ${storageUsage}`
    };
  } catch (error) {
    return {
      name: '数据目录',
      status: 'fail',
      message: `检查数据目录时出错: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 检查服务状态
 */
function checkServices(services: ServiceContainer): any {
  try {
    // 检查主要服务是否已初始化
    const requiredServices = [
      'user',
      'storage',
      'file',
      'posting'
    ];
    
    const missingServices = [];
    
    for (const service of requiredServices) {
      if (!(service in services)) {
        missingServices.push(service);
      }
    }
    
    if (missingServices.length > 0) {
      return {
        name: '核心服务',
        status: 'fail',
        message: `以下服务未正确初始化: ${missingServices.join(', ')}`
      };
    }
    
    return {
      name: '核心服务',
      status: 'pass',
      message: '所有核心服务已正确初始化'
    };
  } catch (error) {
    return {
      name: '核心服务',
      status: 'fail',
      message: `检查服务状态时出错: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 检查系统资源
 */
function checkSystemResources(): any {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercentage = Math.round((1 - freeMem / totalMem) * 100);
    
    // 检查内存使用是否超过90%
    if (usedMemPercentage > 90) {
      return {
        name: '系统资源',
        status: 'fail',
        message: `系统内存使用率过高: ${usedMemPercentage}%`
      };
    }
    
    // 检查磁盘空间
    const availableDiskSpace = true; // 简化处理，实际应检查磁盘空间
    
    if (!availableDiskSpace) {
      return {
        name: '系统资源',
        status: 'fail',
        message: '系统磁盘空间不足'
      };
    }
    
    return {
      name: '系统资源',
      status: 'pass',
      message: `系统资源正常，内存使用率: ${usedMemPercentage}%，可用内存: ${formatBytes(freeMem)}`
    };
  } catch (error) {
    return {
      name: '系统资源',
      status: 'fail',
      message: `检查系统资源时出错: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 获取目录存储使用情况
 */
async function getStorageUsage(directory: string): Promise<string> {
  try {
    // 简单实现，仅计算数据目录大小
    const size = await getDirSize(directory);
    return formatBytes(size);
  } catch (error) {
    return '无法获取';
  }
}

/**
 * 获取目录大小
 */
async function getDirSize(directory: string): Promise<number> {
  try {
    let size = 0;
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += await getDirSize(filePath);
      } else {
        size += stats.size;
      }
    }
    
    return size;
  } catch (error) {
    return 0;
  }
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
  
  return parts.join(' ');
}