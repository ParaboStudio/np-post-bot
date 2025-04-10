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
  private imagesDir: string;
  private metadataDir: string;
  private useMemoryCache: boolean;
  private imageCache: Map<string, Buffer>; // 图片内存缓存
  private metadataCache: Map<string, any>; // 元数据内存缓存

  /**
   * 构造函数
   */
  constructor(options: FileServiceOptions) {
    this.baseDir = options.baseDir;
    this.imagesDir = options.imagesDir || path.join(this.baseDir, 'images');
    this.metadataDir = options.metadataDir || path.join(this.baseDir, 'metadata');
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
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        logger.info(`创建基础目录: ${this.baseDir}`);
      }

      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
        logger.info(`创建图片目录: ${this.imagesDir}`);
      }

      if (!fs.existsSync(this.metadataDir)) {
        fs.mkdirSync(this.metadataDir, { recursive: true });
        logger.info(`创建元数据目录: ${this.metadataDir}`);
      }
    } catch (error) {
      logger.error('初始化目录失败', error);
      throw error;
    }
  }

  /**
   * 获取相对于基础目录的路径
   * @param absolutePath 绝对路径
   * @returns 相对路径
   */
  public getRelativePath(absolutePath: string): string {
    return path.relative(this.baseDir, absolutePath);
  }

  /**
   * 根据相对路径获取绝对路径
   * @param relativePath 相对路径
   * @returns 绝对路径
   */
  public getAbsolutePath(relativePath: string): string {
    return path.resolve(this.baseDir, relativePath);
  }

  /**
   * 保存图片
   * @param imageBuffer 图片数据
   * @param originalName 原始文件名
   * @returns 保存的图片信息
   */
  public async saveImage(imageBuffer: Buffer, originalName: string): Promise<{
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
      
      // 3. 构建存储路径 - 直接存储在images目录下
      const filePath = path.join(this.imagesDir, `${cid}.${extension}`);
      const relativePath = this.getRelativePath(filePath);
      
      // 4. 保存到内存缓存
      if (this.useMemoryCache) {
        this.imageCache.set(cid, imageBuffer);
        logger.debug(`图片已缓存到内存: ${cid}`);
      }
      
      // 5. 尝试写入文件系统（即使使用内存缓存也尝试写入，作为备份）
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
   * @returns 图片数据
   */
  public getImageByCID(cid: string, extension: string = 'png'): Buffer {
    try {
      // 1. 先从内存缓存中获取
      if (this.useMemoryCache && this.imageCache.has(cid)) {
        logger.debug(`从内存缓存获取图片: ${cid}`);
        return this.imageCache.get(cid)!;
      }
      
      // 2. 从文件系统获取
      const filePath = path.join(this.imagesDir, `${cid}.${extension}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`图片不存在: ${filePath}`);
      }
      
      const imageBuffer = fs.readFileSync(filePath);
      
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
      const filePath = path.join(this.metadataDir, `${cid}.json`);
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
      const filePath = path.join(this.metadataDir, `${cid}.json`);
      
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