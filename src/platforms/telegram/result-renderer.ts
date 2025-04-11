/**
 * Telegram结果渲染器模块
 * 负责将命令执行结果渲染为适合Telegram显示的格式
 */
import { logger } from '../../utils/logger.js';
import { Context } from 'telegraf';
import { TelegramImageHelper } from './image-helper.js';
import path from 'path';

/**
 * Telegram结果渲染器
 */
export class TelegramResultRenderer {
  private imageHelper: TelegramImageHelper | null = null;

  /**
   * 设置图像助手
   */
  setImageHelper(imageHelper: TelegramImageHelper) {
    this.imageHelper = imageHelper;
  }

  /**
   * 处理命令执行结果
   */
  public async handleResultData(ctx: Context, data: any) {
    try {
      // 如果数据是空的，不处理
      if (!data || Object.keys(data).length === 0) return;

      // 处理内容详情
      if (data.isDetail === true && data.imagePath) {
        await this.renderDetailWithImage(ctx, data);
        return; // 处理完毕
      }
      
      // 处理内容生成的结果 - 显示文本内容
      if (data.text && data.imagePath) {
        await this.renderContentWithImage(ctx, data);
        return; // 已处理完毕，不需要继续处理
      }
      
      // 处理内容列表
      else if (Array.isArray(data)) {
        await this.renderArray(ctx, data);
        return;
      }
      // 处理其他复杂数据
      else if (typeof data === 'object') {
        await this.renderObject(ctx, data);
      } 
      // 简单数据直接显示
      else {
        await ctx.reply(`返回数据: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logger.error(`处理结果数据失败: ${error instanceof Error ? error.message : '未知错误'}`, error);
      await ctx.reply('处理结果数据时出错，请查看日志');
    }
  }

  /**
   * 渲染详情和图片
   */
  private async renderDetailWithImage(ctx: Context, data: any) {
    // 尝试发送图片
    try {
      if (!this.imageHelper) {
        logger.error('图像助手未初始化');
        return;
      }

      const resolvedPath = this.imageHelper.resolveImagePath(data.imagePath);
      
      if (resolvedPath) {
        await ctx.replyWithPhoto({ source: resolvedPath });
        logger.debug(`成功发送图片: ${resolvedPath}`);
      } else {
        // 如果没有找到图片，发送错误消息
        logger.error(`无法找到图片: ${data.imagePath}`);
        await ctx.reply(`无法找到与此内容关联的图片: ${path.basename(data.imagePath)}`);
      }
    } catch (error) {
      logger.error(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await ctx.reply(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    // 添加导航信息
    if (data.navigation && (data.navigation.hasNext || data.navigation.hasPrevious)) {
      let navMessage = '导航:';
      
      if (data.navigation.hasPrevious && data.navigation.prevCommand) {
        navMessage += ` ${data.navigation.prevCommand} (上一条)`;
      }
      
      if (data.navigation.hasNext && data.navigation.nextCommand) {
        navMessage += ` ${data.navigation.nextCommand} (下一条)`;
      }
      
      await ctx.reply(navMessage);
    }
  }

  /**
   * 渲染内容和图片
   */
  private async renderContentWithImage(ctx: Context, data: any) {
    // 这是内容生成的结果，先发送文本内容
    await ctx.reply(`📝 生成的内容 (ID: ${data.id || '未知'}):\n\n${data.text}`);
    
    // 然后处理图片
    try {
      if (!this.imageHelper) {
        logger.error('图像助手未初始化');
        return;
      }

      // 使用解析方法获取图片路径
      const resolvedPath = this.imageHelper.resolveImagePath(data.imagePath);

      if (resolvedPath) {
        await ctx.replyWithPhoto({ source: resolvedPath });
        logger.debug(`成功发送图片: ${resolvedPath}`);
      } else {
        // 如果没有找到图片，发送错误消息
        logger.error(`无法找到图片: ${data.imagePath}`);
        await ctx.reply(`无法找到图片: ${path.basename(data.imagePath)}`);
      }
    } catch (error) {
      logger.error(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await ctx.reply(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 渲染数组数据
   */
  private async renderArray(ctx: Context, data: any[]) {
    // 记录接收到的数据，便于调试
    logger.debug(`收到数组数据处理: 数组长度=${data.length}, 第一项=${JSON.stringify(data[0])}`);
    
    if (data.length === 0) {
      await ctx.reply('列表为空，没有找到数据');
      return;
    }
    
    // 检查是否是内容列表 (通过判断第一项是否有典型的内容字段)
    const firstItem = data[0];
    const isContentList = firstItem && (firstItem.text !== undefined || firstItem.ensLabel !== undefined);
    
    if (isContentList) {
      logger.debug(`识别为内容列表，开始格式化`);
      
      // 分批发送，避免消息过长
      const chunkSize = 5; // 每批显示5项
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        const formattedData = chunk.map((item, index) => {
          const itemIndex = i + index + 1;
          const textPreview = item.text 
            ? (item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text)
            : '无文本内容';
          
          return `ID: ${item.id || '未知ID'}\n` +
                 `社区: ${item.ensLabel || '未知社区'}\n` +
                 `状态: ${item.status || 'draft'}\n` +
                 `内容: ${textPreview}\n`;
        }).join('\n');
        
        // 发送这一批
        const batchInfo = data.length > chunkSize 
          ? `内容列表 (${i+1}-${Math.min(i+chunkSize, data.length)}/${data.length}):\n\n` 
          : `内容列表 (共${data.length}项):\n\n`;
          
        await ctx.reply(batchInfo + formattedData);
      }
    } else {
      // 处理其他类型的列表
      logger.debug(`非内容列表，使用通用格式化`);
      
      // 可能是其他类型的列表，使用通用处理
      const formattedData = data.map((item, index) => {
        if (item.id && typeof item.text === 'string') {
          // 看起来是内容项
          return `${index + 1}. ID: ${item.id} \n${item.text.substring(0, 100)}...\n`;
        } else if (item.address) {
          // 看起来是钱包项
          return `${index + 1}. 地址: ${item.address}`;
        } else if (item.username) {
          // 看起来是用户项
          return `${index + 1}. 用户名: ${item.username}`;
        } else {
          return `${index + 1}. ${JSON.stringify(item)}`;
        }
      }).join('\n');
      
      await ctx.reply(`数据列表 (${data.length} 项):\n${formattedData}`);
    }
  }

  /**
   * 渲染对象数据
   */
  private async renderObject(ctx: Context, data: Record<string, any>) {
    const formattedData = Object.entries(data)
      .map(([key, value]) => {
        if (key === 'privateKey') {
          return `${key}: [已隐藏]`;
        }
        
        const valueStr = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
        return `${key}: ${valueStr}`;
      })
      .join('\n');
    
    await ctx.reply(`返回数据:\n${formattedData}`);
  }
} 