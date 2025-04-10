/**
 * 存储服务 - 负责管理应用数据
 */
import fs from 'fs';
import path from 'path';
import { StorageServiceOptions, UserData, ContentRecord, WalletRecord, MetadataRecord, Config } from '../types/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * 存储服务类
 */
export class StorageService {
  private dataDir: string;
  private usersDir: string;
  private metadataDir: string;
  private config: Config;
  private data: {
    users: Record<string, UserData>;
    chains: Record<string, { rpcUrl: string; contractAddress: string }>;
  };

  /**
   * 构造函数
   */
  constructor(options: StorageServiceOptions) {
    this.dataDir = options.dataDir;
    this.usersDir = path.join(this.dataDir, 'users');
    this.metadataDir = path.join(this.dataDir, 'metadata');
    this.config = options.config;
    
    this.data = {
      users: {},
      chains: {}
    };

    // 初始化数据存储
    this.init();
  }

  /**
   * 初始化存储服务
   */
  private async init(): Promise<void> {
    try {
      // 确保数据目录和子目录存在
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info(`创建数据目录: ${this.dataDir}`);
      }
      
      if (!fs.existsSync(this.usersDir)) {
        fs.mkdirSync(this.usersDir, { recursive: true });
        logger.info(`创建用户数据目录: ${this.usersDir}`);
      }
      
      if (!fs.existsSync(this.metadataDir)) {
        fs.mkdirSync(this.metadataDir, { recursive: true });
        logger.info(`创建元数据目录: ${this.metadataDir}`);
      }

      // 尝试加载现有数据
      await this.loadData();

      // 如果没有admin用户，创建默认用户
      if (!this.data.users['admin']) {
        this.data.users['admin'] = {
          username: 'admin',
          role: 'admin',
          wallets: [],
          contents: {},
          settings: {
            currentChain: config.DEFAULT_CHAIN,
            defaultPrompt: '写一篇关于社区的文章，描述它的特点和价值'
          },
          history: [],
          metadata: {} // 初始化元数据存储
        };
        
        // 保存初始数据
        await this.saveData();
        logger.info('创建默认admin用户');
      }

      // 为旧用户数据添加元数据对象
      for (const username in this.data.users) {
        if (!this.data.users[username].metadata) {
          this.data.users[username].metadata = {};
          logger.info(`为用户 ${username} 添加元数据存储`);
        }
      }

      // 如果没有链配置，添加默认配置
      if (Object.keys(this.data.chains).length === 0) {
        // 使用配置中的默认合约地址和RPC URL
        const defaultContractAddress = this.config.DEFAULT_CONTRACT_ADDRESS || '0xc5e5807294a071423a6aA413cEF9efb189B08Dbc';
        const defaultRpcUrl = this.config.DEFAULT_RPC_URL || 'https://rpc.sepolia.org';
        const defaultChain = this.config.DEFAULT_CHAIN || 'sepolia';
        
        this.data.chains[defaultChain] = {
          rpcUrl: defaultRpcUrl,
          contractAddress: defaultContractAddress
        };
        
        // 保存初始数据
        await this.saveData();
        logger.info('创建默认链配置');
      }

      // 将现有元数据迁移到独立文件
      for (const username in this.data.users) {
        await this.migrateMetadataToFiles(username);
      }

      logger.info('存储服务初始化完成');
    } catch (error) {
      logger.error('存储服务初始化失败', error);
    }
  }

  /**
   * 从文件加载数据
   */
  private async loadData(): Promise<void> {
    try {
      // 1. 先尝试加载系统配置数据
      const systemDataPath = path.join(this.dataDir, 'system.json');
      
      if (fs.existsSync(systemDataPath)) {
        const rawData = fs.readFileSync(systemDataPath, 'utf8');
        const systemData = JSON.parse(rawData);
        this.data.chains = systemData.chains || {};
        logger.info('系统配置数据加载成功');
      } else {
        logger.info('未找到系统配置数据文件，使用默认数据');
        this.data.chains = {};
      }
      
      // 2. 检查是否有旧的data.json文件
      const oldDataPath = path.join(this.dataDir, 'data.json');
      if (fs.existsSync(oldDataPath)) {
        // 如果有旧数据文件，加载并迁移
        logger.info('发现旧的数据文件，开始迁移...');
        const rawData = fs.readFileSync(oldDataPath, 'utf8');
        const oldData = JSON.parse(rawData);
        
        // 复制用户数据
        this.data.users = oldData.users || {};
        
        // 如果旧数据中有链配置，也复制过来
        if (oldData.chains) {
          this.data.chains = oldData.chains;
        }
        
        // 保存新的分离数据
        await this.saveData();
        
        // 重命名旧数据文件作为备份
        const backupPath = path.join(this.dataDir, `data.json.bak.${Date.now()}`);
        fs.renameSync(oldDataPath, backupPath);
        logger.info(`旧数据已备份到 ${backupPath}`);
      } else {
        // 如果没有旧数据，就尝试从用户目录加载
        this.data.users = await this.loadUsers();
      }
    } catch (error) {
      logger.error('加载数据失败', error);
    }
  }
  
  /**
   * 从用户目录加载所有用户数据
   */
  private async loadUsers(): Promise<Record<string, UserData>> {
    const users: Record<string, UserData> = {};
    
    try {
      if (!fs.existsSync(this.usersDir)) {
        return users;
      }
      
      const userFiles = fs.readdirSync(this.usersDir)
        .filter(file => file.endsWith('.json'));
      
      for (const userFile of userFiles) {
        try {
          const filePath = path.join(this.usersDir, userFile);
          const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const username = userFile.replace('.json', '');
          
          // 确保用户数据有元数据字段（即使是空的）
          if (!userData.metadata) {
            userData.metadata = {};
          }
          
          users[username] = userData;
          logger.debug(`加载用户数据: ${username}`);
        } catch (error) {
          logger.error(`加载用户 ${userFile} 失败`, error);
        }
      }
      
      logger.info(`已加载 ${Object.keys(users).length} 个用户数据`);
    } catch (error) {
      logger.error('加载用户数据失败', error);
    }
    
    return users;
  }

  /**
   * 保存数据到文件
   */
  public async saveData(): Promise<void> {
    try {
      // 1. 保存系统配置数据
      const systemData = {
        chains: this.data.chains
      };
      
      const systemDataPath = path.join(this.dataDir, 'system.json');
      fs.writeFileSync(systemDataPath, JSON.stringify(systemData, null, 2));
      logger.debug('系统配置数据保存成功');
      
      // 2. 保存每个用户的数据到单独的文件
      for (const username in this.data.users) {
        await this.saveUserData(username);
      }
    } catch (error) {
      logger.error('保存数据失败', error);
    }
  }
  
  /**
   * 保存单个用户数据
   */
  private async saveUserData(username: string): Promise<void> {
    try {
      const userData = this.data.users[username];
      if (!userData) return;
      
      // 确保用户目录存在
      if (!fs.existsSync(this.usersDir)) {
        fs.mkdirSync(this.usersDir, { recursive: true });
      }
      
      // 创建用户数据的副本
      const userDataCopy = { ...userData };
      
      // 如果有引用元数据的内容，只保留引用而不保存完整元数据内容
      if (userDataCopy.metadata) {
        // 清除内容字段以减小文件大小，只保留引用信息
        for (const cid in userDataCopy.metadata) {
          if (userDataCopy.metadata[cid].content) {
            // 移除content字段，只保留引用
            delete userDataCopy.metadata[cid].content;
          }
        }
      }
      
      // 保存用户数据
      const userPath = path.join(this.usersDir, `${username}.json`);
      fs.writeFileSync(userPath, JSON.stringify(userDataCopy, null, 2));
      logger.debug(`用户数据保存成功: ${username}`);
    } catch (error) {
      logger.error(`保存用户数据失败: ${username}`, error);
    }
  }
  
  /**
   * 将用户元数据迁移到单独的文件
   */
  private async migrateMetadataToFiles(username: string): Promise<void> {
    try {
      const userData = this.data.users[username];
      if (!userData || !userData.metadata) return;
      
      // 确保元数据目录存在
      if (!fs.existsSync(this.metadataDir)) {
        fs.mkdirSync(this.metadataDir, { recursive: true });
      }
      
      // 创建用户的元数据子目录
      const userMetadataDir = path.join(this.metadataDir, username);
      if (!fs.existsSync(userMetadataDir)) {
        fs.mkdirSync(userMetadataDir, { recursive: true });
      }
      
      // 对每个元数据记录进行处理
      for (const cid in userData.metadata) {
        const metadata = userData.metadata[cid];
        
        // 如果元数据有内容并且没有对应的文件，则创建一个
        if (metadata.content) {
          const metadataFilePath = path.join(userMetadataDir, `${cid}.json`);
          
          // 检查文件是否已存在
          if (!fs.existsSync(metadataFilePath)) {
            // 将内容写入文件
            fs.writeFileSync(metadataFilePath, JSON.stringify(metadata.content, null, 2));
            logger.debug(`创建元数据文件: ${metadataFilePath}`);
            
            // 更新元数据记录的路径
            metadata.path = path.relative(this.dataDir, metadataFilePath);
          }
          
          // 从内存中的记录中删除内容字段，只保留引用
          delete metadata.content;
        }
      }
      
      // 保存更新后的用户数据
      await this.saveUserData(username);
      logger.info(`用户 ${username} 的元数据已迁移到独立文件`);
    } catch (error) {
      logger.error(`迁移元数据失败: ${username}`, error);
    }
  }

  /**
   * 获取用户数据
   */
  public getUserData(username: string): UserData | null {
    return this.data.users[username] || null;
  }

  /**
   * 设置用户数据
   */
  public async setUserData(username: string, userData: UserData): Promise<void> {
    this.data.users[username] = userData;
    await this.saveUserData(username);
  }

  /**
   * 获取所有用户
   */
  public getUsers(): string[] {
    return Object.keys(this.data.users);
  }

  /**
   * 获取用户钱包列表
   */
  public getWallets(username: string): WalletRecord[] {
    const user = this.data.users[username];
    return user ? user.wallets : [];
  }

  /**
   * 添加钱包
   */
  public async addWallet(username: string, privateKey: string, address: string): Promise<WalletRecord> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    // 创建钱包记录
    const wallet: WalletRecord = {
      id: user.wallets.length + 1,
      privateKey,
      address,
      createdAt: new Date()
    };

    // 添加到用户钱包列表
    user.wallets.push(wallet);
    await this.saveUserData(username);

    return wallet;
  }

  /**
   * 删除钱包
   */
  public async deleteWallet(username: string, index: number): Promise<boolean> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    // 检查索引是否有效
    if (index < 1 || index > user.wallets.length) {
      throw new Error(`无效的钱包索引: ${index}`);
    }

    // 删除钱包
    user.wallets = user.wallets.filter(wallet => wallet.id !== index);
    
    // 重新编号剩余钱包
    user.wallets.forEach((wallet, idx) => {
      wallet.id = idx + 1;
    });

    await this.saveUserData(username);
    return true;
  }

  /**
   * 清除所有钱包
   */
  public async clearWallets(username: string): Promise<boolean> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    user.wallets = [];
    await this.saveUserData(username);
    return true;
  }

  /**
   * 获取内容列表
   */
  public getContents(username: string, ensLabel?: string): ContentRecord[] {
    const user = this.data.users[username];

    if (!user) {
      return [];
    }

    const contents = Object.values(user.contents);
    
    if (ensLabel) {
      return contents.filter(content => content.ensLabel === ensLabel);
    }
    
    return contents;
  }

  /**
   * 获取内容
   */
  public getContent(username: string, contentId: string): ContentRecord | null {
    const user = this.data.users[username];
    if (!user) {
      return null;
    }

    return user.contents[contentId] || null;
  }

  /**
   * 添加内容
   */
  public async addContent(username: string, content: Omit<ContentRecord, 'id'>): Promise<ContentRecord> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    // 生成唯一ID
    // const id = this.generateId();
    const len = Object.keys(user.contents)?.length || 0;

    const id = (+len + 1).toString();

    const contentRecord: ContentRecord = {
      ...content,
      id,
      status: content.status || 'draft',
      createdAt: new Date()
    };

    // 添加到用户内容
    user.contents[id] = contentRecord;
    await this.saveUserData(username);

    return contentRecord;
  }

  /**
   * 更新内容
   */
  public async updateContent(username: string, contentId: string, updates: Partial<ContentRecord>): Promise<ContentRecord | null> {
    const user = this.data.users[username];
    if (!user) {
      return null;
    }

    const content = user.contents[contentId];
    if (!content) {
      return null;
    }

    // 更新内容
    user.contents[contentId] = {
      ...content,
      ...updates,
      updatedAt: new Date()
    };

    await this.saveUserData(username);
    return user.contents[contentId];
  }

  /**
   * 删除内容
   */
  public async deleteContent(username: string, contentId: string): Promise<boolean> {
    const user = this.data.users[username];
    if (!user || !user.contents[contentId]) {
      return false;
    }

    delete user.contents[contentId];
    await this.saveUserData(username);
    return true;
  }

  /**
   * 添加历史记录
   */
  public async addHistory(username: string, history: {
    type: 'publish' | 'generate';
    contentId?: string;
    ensLabel?: string;
    txHash?: string;
    status: 'success' | 'fail';
    message?: string;
  }): Promise<void> {
    const user = this.data.users[username];
    if (!user) {
      return;
    }

    user.history.push({
      id: this.generateId(),
      timestamp: new Date(),
      ...history
    });

    // 限制历史记录数量
    if (user.history.length > 100) {
      user.history = user.history.slice(-100);
    }

    await this.saveUserData(username);
  }

  /**
   * 获取历史记录
   */
  public getHistory(username: string, limit = 10): any[] {
    const user = this.data.users[username];
    if (!user) {
      return [];
    }

    // 返回最新的记录
    return [...user.history]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * 获取用户设置
   */
  public getUserSettings(username: string): any {
    const user = this.data.users[username];
    return user ? user.settings : null;
  }

  /**
   * 更新用户设置
   */
  public async updateUserSettings(username: string, settings: Partial<any>): Promise<any> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    user.settings = {
      ...user.settings,
      ...settings
    };

    await this.saveUserData(username);
    return user.settings;
  }

  /**
   * 获取链配置
   */
  public getChainConfig(name: string): { rpcUrl: string; contractAddress: string } | null {
    return this.data.chains[name] || null;
  }

  /**
   * 获取所有链配置
   */
  public getAllChains(): Record<string, { rpcUrl: string; contractAddress: string }> {
    return { ...this.data.chains };
  }

  /**
   * 设置链配置
   */
  public async setChainConfig(name: string, config: { rpcUrl: string; contractAddress: string }): Promise<void> {
    this.data.chains[name] = config;
    
    // 只保存系统配置数据
    const systemData = {
      chains: this.data.chains
    };
    
    const systemDataPath = path.join(this.dataDir, 'system.json');
    fs.writeFileSync(systemDataPath, JSON.stringify(systemData, null, 2));
    logger.debug('链配置数据保存成功');
  }

  /**
   * 删除链配置
   */
  public async deleteChainConfig(name: string): Promise<boolean> {
    if (!this.data.chains[name]) {
      return false;
    }

    delete this.data.chains[name];
    
    // 只保存系统配置数据
    const systemData = {
      chains: this.data.chains
    };
    
    const systemDataPath = path.join(this.dataDir, 'system.json');
    fs.writeFileSync(systemDataPath, JSON.stringify(systemData, null, 2));
    logger.debug('链配置数据保存成功');
    
    return true;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * 添加元数据记录
   */
  public async addMetadata(
    username: string, 
    metadata: Omit<MetadataRecord, 'createdAt'>
  ): Promise<MetadataRecord> {
    const user = this.data.users[username];
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }

    // 确保元数据对象存在
    if (!user.metadata) {
      user.metadata = {};
    }

    // 创建元数据记录
    const metadataRecord: MetadataRecord = {
      ...metadata,
      createdAt: new Date()
    };

    // 添加到用户元数据
    user.metadata[metadata.cid] = metadataRecord;

    // 更新关联的内容记录
    if (metadata.contentId && user.contents[metadata.contentId]) {
      user.contents[metadata.contentId].metadataCid = metadata.cid;
      user.contents[metadata.contentId].metadataPath = metadata.path;
    }

    // 如果有内容，将其保存到独立文件
    if (metadata.content) {
      const userMetadataDir = path.join(this.metadataDir, username);
      
      // 确保目录存在
      if (!fs.existsSync(userMetadataDir)) {
        fs.mkdirSync(userMetadataDir, { recursive: true });
      }
      
      // 保存内容到文件
      const metadataFilePath = path.join(userMetadataDir, `${metadata.cid}.json`);
      fs.writeFileSync(metadataFilePath, JSON.stringify(metadata.content, null, 2));
      
      // 更新相对路径
      metadataRecord.path = path.relative(this.dataDir, metadataFilePath);
      
      // 从内存中删除内容对象
      delete metadataRecord.content;
    }

    // 保存用户数据
    await this.saveUserData(username);
    return metadataRecord;
  }

  /**
   * 获取元数据记录
   */
  public getMetadata(username: string, cid: string): MetadataRecord | null {
    const user = this.data.users[username];
    if (!user || !user.metadata) {
      return null;
    }

    // 获取元数据引用
    const metadataRef = user.metadata[cid];
    if (!metadataRef) {
      return null;
    }
    
    // 构造结果对象
    const result: MetadataRecord = { ...metadataRef };
    
    // 如果有路径，尝试加载内容
    if (metadataRef.path) {
      try {
        const absolutePath = path.join(this.dataDir, metadataRef.path);
        if (fs.existsSync(absolutePath)) {
          result.content = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
        }
      } catch (error) {
        logger.error(`读取元数据文件失败: ${metadataRef.path}`, error);
      }
    }

    return result;
  }

  /**
   * 获取内容的元数据
   */
  public getContentMetadata(username: string, contentId: string): MetadataRecord | null {
    const user = this.data.users[username];
    if (!user || !user.contents[contentId] || !user.metadata) {
      return null;
    }

    const content = user.contents[contentId];
    if (!content.metadataCid) {
      return null;
    }

    return this.getMetadata(username, content.metadataCid);
  }

  /**
   * 获取默认链名称
   */
  public getDefaultChain(): string {
    return this.config.DEFAULT_CHAIN || 'sepolia';
  }
} 