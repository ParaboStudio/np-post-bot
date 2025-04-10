/**
 * AI服务 - 处理内容生成
 */
import axios from 'axios';
import { Config } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * AI服务
 */
export class AIService {
  private config: Config;

  /**
   * 构造函数
   */
  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 生成文本内容
   */
  public async generateText(prompt: string, language: string = 'Chinese'): Promise<string> {
    try {
      logger.info(`使用AI生成文本, 提示词: "${prompt.substring(0, 50)}..."`);
      
      // 获取文本生成端点
      const textEndpoint = this.config.AI_TEXT_ENDPOINT || '/api/ai-agent/composer/compose';
      const endpoint = `${this.config.BASE_URL}${textEndpoint}`;
      
      const response = await axios.post(
        endpoint,
        {
          user_prompt: prompt,
          language: language,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.status?.toString()?.startsWith('2')) {
        throw new Error(`服务器返回错误: ${response.status}`);
      }
      
      const result = response.data;
      
      if (!result.text) {
        throw new Error('AI返回的数据格式不正确');
      }
      
      logger.info('文本生成成功');
      return result.text;
    } catch (error: any) {
      logger.error('生成文本失败', error);
      throw new Error(`生成文本失败: ${(error as Error).message || String(error)}`);
    }
  }

  /**
   * 生成图片
   */
  public async generateImage(text: string, ticker: string = ''): Promise<{
    fileName: string;
    data: Buffer;
    type: string;
    url: string;
  }> {
    try {
      logger.info(`使用AI生成图片, 基于文本: "${text.substring(0, 50)}..."`);
      
      // 获取图片生成端点
      const imageEndpoint = this.config.AI_IMAGE_ENDPOINT || '/api/ai-agent/composer/generateImage';
      const endpoint = `${this.config.BASE_URL}${imageEndpoint}`;
      
      const response = await axios.post(
        endpoint,
        {
          text: text,
          ticker: ticker,
          language: 'Chinese'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.status?.toString()?.startsWith('2')) {
        throw new Error(`服务器返回错误: ${response.status}`);
      }
      
      const result = response.data;
      
      if (!result.image_data) {
        throw new Error('AI返回的数据格式不正确');
      }
      
      // Base64转换为Buffer
      const imageBuffer = Buffer.from(result.image_data, 'base64');
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${random}_ai-generated_${Date.now()}.png`;
      
      logger.info('图片生成成功');
      
      return {
        fileName,
        data: imageBuffer,
        type: 'image/png',
        url: `data:image/png;base64,${result.image_data}`
      };
    } catch (error: any) {
      logger.error('生成图片失败', error);
      throw new Error(`生成图片失败: ${(error as Error).message || String(error)}`);
    }
  }

  /**
   * 生成默认提示词
   */
  public generateDefaultPrompt(communityName: string): string {
    return `写一篇关于${communityName}社区的帖子，描述它的特点和价值`;
  }
} 