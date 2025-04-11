/**
 * Telegram图像处理模块
 * 负责处理与图片相关的功能
 */
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { PathLike } from 'fs';
import { Config } from '../../types/index.js';
import { getDataDirectory } from '../../config/index.js';

/**
 * Telegram图像助手
 */
export class TelegramImageHelper {
  private config: Config | null = null;

  /**
   * 初始化图像助手
   */
  public init(config: Config) {
    this.config = config;
  }

  /**
   * 解析图片文件的完整路径
   */
  public resolveImagePath(imagePath: string): string | null {
    // 记录原始路径以便调试
    logger.debug(`尝试解析图片路径: ${imagePath}`);

    // 如果是绝对路径且文件存在，直接返回
    if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) {
      logger.debug(`图片是有效的绝对路径`);
      return imagePath;
    }

    // 获取数据目录 - 使用配置中已有的函数
    const dataDir = this.config?.DATA_DIR || getDataDirectory();

    // 提取图片文件名
    const imageName = path.basename(imagePath);
    logger.debug(`图片文件名: ${imageName}, 数据目录: ${dataDir}`);

    // 定义可能的路径
    const possibleLocations = [
      // 1. 直接使用原始路径
      imagePath,

      // 2. 相对于数据目录的 images 子目录
      path.join(dataDir, 'images', imageName),

      // 3. 如果原始路径中已经包含 images/，则尝试以数据目录为基础
      imagePath.includes('images/')
        ? path.join(dataDir, imagePath)
        : null,

      // 4. 相对于工作目录
      path.join(process.cwd(), imagePath),

      // 5. 相对于工作目录的 images 子目录
      path.join(process.cwd(), 'images', imageName)
    ].filter(Boolean); // 过滤掉 null 值

    // 查找第一个存在的路径
    for (const location of possibleLocations) {
      if (fs.existsSync(location as PathLike)) {
        logger.debug(`找到图片文件: ${location}`);
        return location;
      }
    }

    // 记录所有尝试的路径
    logger.error(`找不到图片文件，尝试了以下路径: ${possibleLocations.join(', ')}`);
    return null;
  }

  /**
   * 清理图片文件
   * @param directory 图片目录
   * @param pattern 可选的文件名过滤模式
   * @returns 清理结果，包含删除的文件数量和释放的空间
   */
  public async cleanupImages(directory: string, pattern: string = ''): Promise<{count: number, size: number}> {
    try {
      logger.info(`开始清理图片目录: ${directory}${pattern ? `, 过滤模式: ${pattern}` : ''}`);
      
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
                logger.debug(`已删除图片: ${file}`);
              }
            }
          }
        } catch (error) {
          logger.error(`处理文件时出错: ${file}`, error);
          // 继续处理其他文件
        }
      }
      
      logger.info(`图片清理完成，删除了${count}个文件，释放了${this.formatBytes(size)}空间`);
      
      return { count, size };
    } catch (error) {
      logger.error('清理图片文件失败', error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   */
  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 