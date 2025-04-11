/**
 * 文件服务 - 负责管理本地文件的存储和检索
 */
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { calculateCID } from '../utils/ipfs-utils.js';

/**
 * 文件服务配置
 */
export interface FileServiceOptions {
  baseDir: string;
  imagesDir?: string;
  metadataDir?: string;
  useMemoryCache?: boolean; // 是否使用内存缓存
}

/**
 * 文件服务类
 */
export class FileService {
  private baseDir: string;
  private globalImagesDir: string;
  private globalMetadataDir: string;
  private useMemoryCache: boolean;
  private imageCache: Map<string, Buffer>; // 图片内存缓存
  private metadataCache: Map<string, any>; // 元数据内存缓存

  /**
   * 构造函数
   */
  constructor(options: FileServiceOptions) {
    this.baseDir = options.baseDir;
    
    // 全局共享目录
    const globalDir = path.join(this.baseDir, 'global');
    this.globalImagesDir = path.join(globalDir, 'images');
    this.globalMetadataDir = path.join(globalDir, 'metadata');

    this.useMemoryCache = options.useMemoryCache || process.env.NODE_ENV === 'production';
    
    // 初始化缓存
    this.imageCache = new Map<string, Buffer>();
    this.metadataCache = new Map<string, any>();

    // 初始化目录
    this.initDirectories();
    
    logger.info(`文件服务初始化完成，内存缓存状态: ${this.useMemoryCache ? '启用' : '禁用'}`);
  }

  /**
   * 初始化存储目录
   */
  private initDirectories(): void {
    try {
      // 确保全局目录存在
      const globalDir = path.join(this.baseDir, 'global');
      if (!fs.existsSync(globalDir)) {
        fs.mkdirSync(globalDir, { recursive: true });
        logger.info(`创建全局目录: ${globalDir}`);
      }

      // 确保全局图片目录存在
      if (!fs.existsSync(this.globalImagesDir)) {
        fs.mkdirSync(this.globalImagesDir, { recursive: true });
        logger.info(`创建全局图片目录: ${this.globalImagesDir}`);
      }

      // 确保全局元数据目录存在
      if (!fs.existsSync(this.globalMetadataDir)) {
        fs.mkdirSync(this.globalMetadataDir, { recursive: true });
        logger.info(`创建全局元数据目录: ${this.globalMetadataDir}`);
      }
      
      // 确保管理员目录存在
      const adminDir = path.join(this.baseDir, 'admin');
      if (!fs.existsSync(adminDir)) {
        fs.mkdirSync(adminDir, { recursive: true });
        logger.info(`创建管理员目录: ${adminDir}`);
      }
      
      // 确保管理员图片目录存在
      const adminImagesDir = path.join(adminDir, 'images');
      if (!fs.existsSync(adminImagesDir)) {
        fs.mkdirSync(adminImagesDir, { recursive: true });
        logger.info(`创建管理员图片目录: ${adminImagesDir}`);
      }
      
      // 确保用户基础目录存在
      const usersDir = path.join(this.baseDir, 'users');
      if (!fs.existsSync(usersDir)) {
        fs.mkdirSync(usersDir, { recursive: true });
        logger.info(`创建用户基础目录: ${usersDir}`);
      }
    } catch (error) {
      logger.error('初始化目录失败', error);
      throw error;
    }
  }
  
  /**
   * 获取用户特定的图片目录
   * @param userId 用户ID
   */
  public getUserImagesDir(userId: string): string {
    if (userId === 'admin') {
      return path.join(this.baseDir, 'admin', 'images');
    } else {
      const userDir = path.join(this.baseDir, 'users', userId);
      const imagesDir = path.join(userDir, 'images');
      
      // 确保目录存在
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      return imagesDir;
    }
  }
  
  /**
   * 获取用户特定的元数据目录
   * @param userId 用户ID
   */
  public getUserMetadataDir(userId: string): string {
    if (userId === 'admin') {
      return path.join(this.baseDir, 'admin', 'metadata');
    } else {
      const userDir = path.join(this.baseDir, 'users', userId);
      const metadataDir = path.join(userDir, 'metadata');
      
      // 确保目录存在
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }
      
      return metadataDir;
    }
  }

  /**
   * 获取相对路径
   */
  private getRelativePath(absolutePath: string): string {
    return path.relative(this.baseDir, absolutePath);
  }

  /**
   * 保存图片
   * @param imageBuffer 图片数据
   * @param originalName 原始文件名
   * @param userId 用户ID，用于确定存储位置
   * @returns 保存的图片信息
   */
  public async saveImage(
    imageBuffer: Buffer, 
    originalName: string, 
    userId: string = 'admin'
  ): Promise<{
    cid: string;
    path: string;
    relativePath: string;
    name: string;
    size: number;
  }> {
    try {
      // 1. 计算图片CID
      const imageFile = {
        data: imageBuffer,
        name: originalName
      };
      
      const cid = await calculateCID(imageFile);
      logger.debug(`图片CID: ${cid}`);
      
      // 2. 获取文件扩展名
      const extension = path.extname(originalName).slice(1) || 'png';
      
      // 3. 获取用户的图片目录
      const userImagesDir = this.getUserImagesDir(userId);
      
      // 4. 构建存储路径 - 存储在用户特定的图片目录下
      const filePath = path.join(userImagesDir, `${cid}.${extension}`);
      const relativePath = this.getRelativePath(filePath);
      
      // 5. 保存到内存缓存
      if (this.useMemoryCache) {
        this.imageCache.set(cid, imageBuffer);
        logger.debug(`图片已缓存到内存: ${cid}`);
      }
      
      // 6. 尝试写入文件系统（即使使用内存缓存也尝试写入，作为备份）
      try {
        // 检查文件是否已存在
        if (fs.existsSync(filePath)) {
          logger.info(`图片已存在，直接使用: ${filePath}`);
        } else {
          // 写入文件
          fs.writeFileSync(filePath, imageBuffer);
          logger.info(`保存图片: ${filePath}`);
        }
      } catch (fsError) {
        // 如果在Vercel环境下写入失败但启用了内存缓存，不会抛出错误
        if (this.useMemoryCache) {
          logger.warn(`无法写入文件系统，将仅使用内存缓存: ${fsError instanceof Error ? fsError.message : '未知错误'}`);
        } else {
          // 如果没有启用内存缓存，则抛出错误
          throw fsError;
        }
      }
      
      return {
        cid,
        path: filePath,
        relativePath,
        name: `${cid}.${extension}`,
        size: imageBuffer.length
      };
    } catch (error) {
      logger.error('保存图片失败', error);
      throw error;
    }
  }

  /**
   * 根据CID获取图片
   * @param cid 图片CID
   * @param extension 文件扩展名
   * @param userId 用户ID，用于定位图片
   * @returns 图片数据
   */
  public getImageByCID(cid: string, extension: string = 'png', userId?: string): Buffer {
    try {
      // 1. 先从内存缓存中获取
      if (this.useMemoryCache && this.imageCache.has(cid)) {
        logger.debug(`从内存缓存获取图片: ${cid}`);
        return this.imageCache.get(cid)!;
      }
      
      // 2. 从文件系统获取
      // 首先尝试在用户特定目录查找（如果提供了userId）
      let imageBuffer: Buffer | null = null;
      
      if (userId) {
        const userImagesDir = this.getUserImagesDir(userId);
        const userFilePath = path.join(userImagesDir, `${cid}.${extension}`);
        
        if (fs.existsSync(userFilePath)) {
          imageBuffer = fs.readFileSync(userFilePath);
          logger.debug(`从用户图片目录获取图片: ${userFilePath}`);
        }
      }
      
      // 如果没有在用户目录找到，尝试在全局目录查找
      if (!imageBuffer) {
        const globalFilePath = path.join(this.globalImagesDir, `${cid}.${extension}`);
        
        if (fs.existsSync(globalFilePath)) {
          imageBuffer = fs.readFileSync(globalFilePath);
          logger.debug(`从全局图片目录获取图片: ${globalFilePath}`);
        }
      }
      
      // 如果仍未找到，尝试在管理员目录查找
      if (!imageBuffer) {
        const adminFilePath = path.join(this.baseDir, 'admin', 'images', `${cid}.${extension}`);
        
        if (fs.existsSync(adminFilePath)) {
          imageBuffer = fs.readFileSync(adminFilePath);
          logger.debug(`从管理员图片目录获取图片: ${adminFilePath}`);
        }
      }
      
      // 如果仍未找到，尝试在旧的图片目录结构中查找（兼容性）
      if (!imageBuffer) {
        // 旧的图片目录结构
        const oldImagesDir = path.join(this.baseDir, 'images');
        if (fs.existsSync(oldImagesDir)) {
          const oldFilePath = path.join(oldImagesDir, `${cid}.${extension}`);
          
          if (fs.existsSync(oldFilePath)) {
            imageBuffer = fs.readFileSync(oldFilePath);
            logger.debug(`从旧图片目录获取图片: ${oldFilePath}`);
          }
        }
      }
      
      // 如果仍未找到图片，抛出错误
      if (!imageBuffer) {
        throw new Error(`图片不存在: ${cid}.${extension}`);
      }
      
      // 3. 读取成功后添加到内存缓存
      if (this.useMemoryCache) {
        this.imageCache.set(cid, imageBuffer);
        logger.debug(`图片已添加到内存缓存: ${cid}`);
      }
      
      return imageBuffer;
    } catch (error) {
      logger.error(`获取图片失败: ${cid}`, error);
      throw error;
    }
  }

  /**
   * 保存元数据
   * @param metadataBuffer 元数据Buffer
   * @param cid 元数据CID
   * @returns 保存信息
   */
  public saveMetadata(metadataBuffer: Buffer, cid: string): {
    path: string;
    relativePath: string;
  } {
    try {
      // 解析元数据内容
      const metadataContent = JSON.parse(metadataBuffer.toString('utf8'));
      
      // 添加到内存缓存
      if (this.useMemoryCache) {
        this.metadataCache.set(cid, metadataContent);
        logger.debug(`元数据已缓存到内存: ${cid}`);
      }
      
      // 构建存储路径 - 直接存储在metadata目录下
      const filePath = path.join(this.globalMetadataDir, `${cid}.json`);
      const relativePath = this.getRelativePath(filePath);
      
      // 尝试写入文件系统
      try {
        // 检查文件是否已存在
        if (fs.existsSync(filePath)) {
          logger.info(`元数据已存在，直接使用: ${filePath}`);
        } else {
          // 写入文件
          fs.writeFileSync(filePath, metadataBuffer);
          logger.info(`保存元数据: ${filePath}`);
        }
      } catch (fsError) {
        // 如果在Vercel环境下写入失败但启用了内存缓存，不会抛出错误
        if (this.useMemoryCache) {
          logger.warn(`无法写入文件系统，将仅使用内存缓存: ${fsError instanceof Error ? fsError.message : '未知错误'}`);
        } else {
          // 如果没有启用内存缓存，则抛出错误
          throw fsError;
        }
      }
      
      return { 
        path: filePath,
        relativePath
      };
    } catch (error) {
      logger.error(`保存元数据失败: ${cid}`, error);
      throw error;
    }
  }

  /**
   * 获取元数据
   * @param cid 元数据CID
   * @returns 元数据内容
   */
  public getMetadata(cid: string): any {
    try {
      // 1. 先从内存缓存中获取
      if (this.useMemoryCache && this.metadataCache.has(cid)) {
        logger.debug(`从内存缓存获取元数据: ${cid}`);
        return this.metadataCache.get(cid);
      }
      
      // 2. 从文件系统获取
      const filePath = path.join(this.globalMetadataDir, `${cid}.json`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`元数据不存在: ${filePath}`);
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      const metadata = JSON.parse(data);
      
      // 3. 读取成功后添加到内存缓存
      if (this.useMemoryCache) {
        this.metadataCache.set(cid, metadata);
        logger.debug(`元数据已添加到内存缓存: ${cid}`);
      }
      
      return metadata;
    } catch (error) {
      logger.error(`获取元数据失败: ${cid}`, error);
      throw error;
    }
  }
  
  /**
   * 清理内存缓存
   * 释放内存资源
   */
  public clearCache(): void {
    const imageCount = this.imageCache.size;
    const metadataCount = this.metadataCache.size;
    
    this.imageCache.clear();
    this.metadataCache.clear();
    
    logger.info(`已清理内存缓存: ${imageCount}个图片, ${metadataCount}个元数据`);
  }
} 