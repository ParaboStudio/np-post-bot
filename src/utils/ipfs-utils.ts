/**
 * IPFS工具函数
 */
import { sha256 } from 'multiformats/hashes/sha2';
import { CID } from 'multiformats/cid';
import * as dagPb from '@ipld/dag-pb';
import { importer, ImporterOptions } from 'ipfs-unixfs-importer';
import { MemoryBlockstore } from 'blockstore-core/memory';
import logger from './logger.js';

// IPFS计算选项 - 保持与社区发帖一致
const IPFS_OPTIONS = {
  cidVersion: 1,
  rawLeaves: true,
  leafType: 'raw',
  chunkSize: 524288, // 512k
};

/**
 * 计算文件CID
 * @param file 文件对象 (Buffer、{data, name} 对象)
 * @returns CID字符串
 */
export async function calculateCID(file: Buffer | { data: Buffer, name: string }): Promise<string> {
  try {
    logger.debug("计算文件CID...");
    // 创建一个内存块存储
    const blockstore = new MemoryBlockstore();

    // 准备文件数据
    let data: Uint8Array;
    let fileName: string;

    // 判断是Buffer还是对象
    if (Buffer.isBuffer(file)) {
      data = new Uint8Array(file);
      fileName = "file.bin"; // 默认文件名
    } else if (file.data && file.name) {
      // 如果是自定义对象，包含data和name
      data = new Uint8Array(file.data);
      fileName = file.name;
    } else {
      throw new Error("不支持的文件类型");
    }

    // 使用IPFS的分片和DAG构建逻辑
    const entries = [];
    for await (const entry of importer(
      [
        {
          path: fileName,
          content: data,
        },
      ],
      blockstore,
      IPFS_OPTIONS as ImporterOptions
    )) {
      entries.push(entry);
    }

    // 最后一个条目包含根CID
    const rootEntry = entries[entries.length - 1];
    logger.debug(`CID计算完成: ${rootEntry.cid.toString()}`);
    return rootEntry.cid.toString();
  } catch (error) {
    logger.error("IPFS CID计算错误", error);

    // 回退到简单方法
    let data: Uint8Array;
    if (Buffer.isBuffer(file)) {
      data = new Uint8Array(file);
    } else if (file.data) {
      data = new Uint8Array(file.data);
    } else {
      throw new Error("无法处理的文件类型");
    }

    logger.debug("使用备用方法计算CID...");
    const hash = await sha256.digest(data);
    const cid = CID.create(1, dagPb.code, hash);
    return cid.toString();
  }
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  // 提取文件扩展名
  const extension = originalName.split('.').pop() || 'bin';

  // 根据是否有prefix生成文件名
  const fileName = prefix
    ? `${prefix}_${random}_${timestamp}`
    : `${random}_${timestamp}`;
    
  return `${fileName}.${extension}`;
}

/**
 * 根据CID生成文件路径
 * @param cid CID字符串
 * @param extension 文件扩展名
 * @param baseDir 基础目录
 * @returns 文件路径
 */
export function getFilePathFromCID(cid: string, extension: string, baseDir: string): string {
  // 使用CID的前8个字符作为子目录，避免单个目录下文件过多
  const subDir = cid.substring(0, 8);
  return `${baseDir}/${subDir}/${cid}.${extension}`;
} 