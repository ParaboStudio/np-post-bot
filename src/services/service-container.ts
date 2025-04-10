/**
 * 服务容器类
 * 管理所有服务实例的中央容器
 */
import { logger } from '../utils/logger.js';

// 服务容器接口
export interface ServiceInterface {
  name: string;
  init?: () => Promise<void>;
}

export class ServiceContainer {
  private services: Map<string, ServiceInterface>;

  constructor() {
    this.services = new Map();
    logger.info('服务容器已初始化');
  }

  /**
   * 注册服务到容器
   * @param service 服务实例
   */
  register<T extends ServiceInterface>(service: T): T {
    if (this.services.has(service.name)) {
      logger.warn(`服务 ${service.name} 已存在，将被覆盖`);
    }
    
    this.services.set(service.name, service);
    logger.info(`服务 ${service.name} 已注册`);
    return service;
  }

  /**
   * 获取服务实例
   * @param name 服务名称
   * @returns 服务实例
   */
  get<T extends ServiceInterface>(name: string): T {
    const service = this.services.get(name) as T;
    if (!service) {
      logger.error(`服务 ${name} 未找到`);
      throw new Error(`服务 ${name} 未找到`);
    }
    return service;
  }

  /**
   * 获取所有已注册的服务
   * @returns 所有服务实例的数组
   */
  getAll(): ServiceInterface[] {
    return Array.from(this.services.values());
  }

  /**
   * 初始化所有服务
   */
  async initAll(): Promise<void> {
    logger.info('正在初始化所有服务...');
    
    for (const service of this.services.values()) {
      if (service.init) {
        try {
          await service.init();
          logger.info(`服务 ${service.name} 初始化成功`);
        } catch (error) {
          logger.error(`服务 ${service.name} 初始化失败:`, error);
          throw error;
        }
      }
    }
    
    logger.info('所有服务初始化完成');
  }

  /**
   * 检查服务是否已注册
   * @param name 服务名称
   * @returns 是否已注册
   */
  has(name: string): boolean {
    return this.services.has(name);
  }
} 