/**
 * API平台实现
 * 提供HTTP API接口
 */
import { Platform, PlatformInitOptions } from './platform-interface.js';
import { ServiceContainer } from '../services/index.js';
import { CommandRouter } from '../commands/command-router.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import http from 'http';
import url from 'url';

// API请求处理结果
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  version: string;
  timestamp: string;
}

/**
 * API平台实现
 */
export class ApiPlatform implements Platform {
  name: string = 'api';
  private services: ServiceContainer | null = null;
  private commandRouter: CommandRouter | null = null;
  private server: http.Server | null = null;
  private isRunning: boolean = false;
  private port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  /**
   * 初始化API平台
   */
  async init(options?: PlatformInitOptions): Promise<boolean> {
    if (!options) {
      logger.error('初始化API平台失败: 未提供初始化选项');
      return false;
    }
    
    try {
      const { services, commandRouter } = options;
      this.services = services;
      this.commandRouter = commandRouter;
      
      logger.info(`API平台已初始化，端口: ${this.port}`);
      return true;
    } catch (error) {
      logger.error(`初始化API平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }
  
  /**
   * 启动API平台
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      logger.warn('API平台已在运行');
      return true;
    }
    
    try {
      if (!this.commandRouter) {
        throw new Error('CommandRouter未初始化');
      }
      
      const router = this.commandRouter;
      
      // 创建HTTP服务器
      this.server = http.createServer(async (req, res) => {
        // 设置CORS头和JSON内容类型
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        // 处理OPTIONS请求（预检请求）
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        
        // 解析URL
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';
        
        // 准备响应对象
        const response: ApiResponse = {
          success: false,
          message: '未知请求',
          version: config.VERSION || 'unknown',
          timestamp: new Date().toISOString()
        };
        
        try {
          // 路由请求
          if (pathname === '/api/health') {
            // 健康检查端点
            response.success = true;
            response.message = 'API服务正常';
            response.data = {
              status: 'ok',
              uptime: process.uptime()
            };
          } 
          else if (pathname === '/api/system/info') {
            // 系统信息
            const result = await router.route('system info', {});
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else if (pathname === '/api/system/diagnose') {
            // 系统诊断
            const result = await router.route('system diagnose', {});
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else if (pathname === '/api/system/cache') {
            // 缓存管理
            const action = parsedUrl.query.action as string;
            const result = await router.route('system cache', { action });
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else if (pathname === '/api/content/list') {
            // 内容列表
            const ensLabel = parsedUrl.query.ensLabel as string;
            const result = await router.route('content list', { 
              ensLabel: ensLabel || undefined 
            });
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else if (pathname === '/api/content/generate' && req.method === 'POST') {
            // 生成内容 - 需要读取POST请求体
            const body = await readRequestBody(req);
            const data = JSON.parse(body);
            
            if (!data.ensLabel) {
              response.message = '缺少必要参数: ensLabel';
            } else {
              const result = await router.route('content generate', {
                ensLabel: data.ensLabel,
                prompt: data.prompt
              });
              response.success = result.success;
              response.message = result.message;
              response.data = result.data;
            }
          }
          else if (pathname === '/api/publish' && req.method === 'POST') {
            // 发布内容 - 需要读取POST请求体
            const body = await readRequestBody(req);
            const data = JSON.parse(body);
            
            if (!data.ensLabel || (!data.contentId && !data.text)) {
              response.message = '缺少必要参数: ensLabel和contentId/text';
            } else if (data.contentId) {
              // 发布已有内容
              const result = await router.route('publish content', {
                ensLabel: data.ensLabel,
                contentId: data.contentId,
                walletIndex: data.walletIndex
              });
              response.success = result.success;
              response.message = result.message;
              response.data = result.data;
            } else {
              // 快速发布
              const result = await router.route('publish quick', {
                ensLabel: data.ensLabel,
                text: data.text,
                walletIndex: data.walletIndex
              });
              response.success = result.success;
              response.message = result.message;
              response.data = result.data;
            }
          }
          else if (pathname === '/api/scheduler/status') {
            // 调度器状态
            const result = await router.route('scheduler status', {});
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else if (pathname === '/api/scheduler/update' && req.method === 'POST') {
            // 更新调度器配置
            const body = await readRequestBody(req);
            const data = JSON.parse(body);
            
            const result = await router.route('scheduler update', data);
            response.success = result.success;
            response.message = result.message;
            response.data = result.data;
          }
          else {
            // 未知路径
            response.message = `未知API路径: ${pathname}`;
            res.statusCode = 404;
          }
        } catch (error) {
          // 处理错误
          logger.error(`API请求处理错误: ${pathname}`, error);
          response.success = false;
          response.message = `请求处理错误: ${error instanceof Error ? error.message : String(error)}`;
          res.statusCode = 500;
        }
        
        // 发送响应
        res.end(JSON.stringify(response));
      });
      
      // 启动服务器，使用Promise包装以确保能够正确返回结果
      return new Promise((resolve) => {
        this.server?.listen(this.port, () => {
          this.isRunning = true;
          logger.info(`API平台已启动，监听端口: ${this.port}`);
          resolve(true);
        });
        
        this.server?.on('error', (error) => {
          logger.error('API服务器错误', error);
          this.isRunning = false;
          resolve(false);
        });
      });
    } catch (error) {
      logger.error(`启动API平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }
  
  /**
   * 停止API平台
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning || !this.server) {
      logger.warn('API平台未在运行');
      return true;
    }
    
    try {
      // 使用Promise封装以确保能够等待服务器完全关闭
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.isRunning = false;
          logger.info('API平台已停止');
          resolve(true);
        });
      });
    } catch (error) {
      logger.error(`停止API平台失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }
  
  /**
   * 获取平台信息
   */
  getInfo(): Record<string, any> {
    return {
      name: this.name,
      description: 'API HTTP接口',
      version: config.VERSION,
      isRunning: this.isRunning,
      port: this.port
    };
  }
}

/**
 * 读取请求体
 */
function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => {
      reject(err);
    });
  });
} 