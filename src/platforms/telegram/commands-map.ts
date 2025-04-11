/**
 * Telegram命令映射模块
 * 负责将Telegram命令映射到内部命令
 */
import commands from '../../config/commands.js';
import { logger } from '../../utils/logger.js';

/**
 * Telegram命令映射
 */
export class TelegramCommandsMap {
  // 命令映射表 - 将Telegram命令映射到内部命令
  private commandMap: Record<string, string> = {};
  private commandDefinitions: Array<{
    command: string;
    internalCommand: string;
    description: string;
    params: Array<{name: string; description: string; required: boolean;}>;
  }> = [];

  constructor() {
    this.buildCommandMaps();
  }

  /**
   * 从统一命令配置构建映射表
   */
  private buildCommandMaps(): void {
    // 清空映射表
    this.commandMap = {};
    this.commandDefinitions = [];

    // 遍历所有命令
    for (const [internalCommand, definition] of Object.entries(commands)) {
      // 只处理支持Telegram平台的命令
      if (definition.platforms.telegram) {
        const { command, aliases } = definition.platforms.telegram;
        
        // 添加主命令
        this.commandMap[command] = internalCommand;
        
        // 添加到命令定义
        this.commandDefinitions.push({
          command,
          internalCommand,
          description: definition.description,
          params: definition.params
        });
        
        // 添加别名
        if (aliases && aliases.length > 0) {
          for (const alias of aliases) {
            this.commandMap[alias] = internalCommand;
          }
        }
      }
    }

    logger.info(`已加载 ${this.commandDefinitions.length} 个Telegram命令`);
  }

  /**
   * 将Telegram命令映射到内部命令
   */
  public mapCommand(telegramCommand: string): string | null {
    const command = this.commandMap[telegramCommand];
    if (command) {
      logger.debug(`命令映射: ${telegramCommand} -> ${command}`);
      return command;
    }
    logger.warn(`未找到命令映射: ${telegramCommand}`);
    return null;
  }

  /**
   * 获取所有可用的Telegram命令
   */
  public getAvailableCommands(): string[] {
    return Object.keys(this.commandMap);
  }

  /**
   * 获取Telegram机器人命令列表
   */
  public getBotCommands(): Array<{ command: string; description: string }> {
    return this.commandDefinitions.map(def => {
      let description = def.description;
      
      // 添加参数信息到描述
      if (def.params && def.params.length > 0) {
        description += ' ' + def.params.map(param => {
          return param.required ? `<${param.name}>` : `[${param.name}]`;
        }).join(' ');
      }
      
      return {
        command: def.command,
        description
      };
    });
  }
} 