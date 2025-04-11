/**
 * 统一命令配置文件
 * 集中管理所有命令定义，用于跨平台命令路由
 */
import { CommandDefinition } from '../types/commands.js';

/**
 * 统一命令定义
 * 每个命令包含以下信息：
 * - key: 内部命令标识符 (如 'scheduler.add_task')
 * - platforms: 支持此命令的平台及平台特定配置
 * - handler: 处理此命令的模块和方法
 * - description: 命令描述
 * - params: 命令参数定义
 * - category: 命令分类
 */
const commands: Record<string, CommandDefinition> = {
  // 系统命令
  'system.info': {
    platforms: {
      telegram: { command: 'system_info' },
      cli: { command: 'system info' },
      api: { endpoint: '/api/system/info' }
    },
    handler: 'SystemCommands.handleInfo',
    description: '显示系统信息',
    params: [],
    category: '系统'
  },
  'system.diagnose': {
    platforms: {
      telegram: { command: 'system_diagnose' },
      cli: { command: 'system diagnose' },
      api: { endpoint: '/api/system/diagnose' }
    },
    handler: 'SystemCommands.handleDiagnose',
    description: '系统诊断',
    params: [],
    category: '系统'
  },
  'system.version': {
    platforms: {
      telegram: { command: 'system_version' },
      cli: { command: 'system version' },
      api: { endpoint: '/api/system/version' }
    },
    handler: 'SystemCommands.handleVersion',
    description: '显示系统版本',
    params: [],
    category: '系统'
  },
  'system.clear_images': {
    platforms: {
      telegram: { command: 'system_clear_images' },
      cli: { command: 'system clear-images' },
      api: { endpoint: '/api/system/clear-images' }
    },
    handler: 'SystemCommands.handleClearImages',
    description: '清理图片',
    params: [
      { name: 'pattern', description: '文件名模式', required: false }
    ],
    category: '系统'
  },
  
  // 调度器命令
  'scheduler.add_task': {
    platforms: {
      telegram: { 
        command: 'schedule_add',
        aliases: ['sched_add']
      },
      cli: { command: 'schedule add' },
      api: { endpoint: '/api/schedule/add' }
    },
    handler: 'SchedulerCommands.handleAddTask',
    description: '添加定时发布任务',
    params: [
      { name: 'time', description: '发布时间(HH:MM)', required: true },
      { name: 'community', description: '社区标识', required: true },
      { name: 'count', description: '发布数量', required: true },
      { name: 'interval', description: '间隔分钟', required: true },
      { name: 'type', description: '内容类型', required: false }
    ],
    category: '调度任务'
  },
  'scheduler.list_tasks': {
    platforms: {
      telegram: { 
        command: 'schedule_list',
        aliases: ['sched_list']
      },
      cli: { command: 'schedule list' },
      api: { endpoint: '/api/schedule/list' }
    },
    handler: 'SchedulerCommands.handleListTasks',
    description: '列出所有定时任务',
    params: [],
    category: '调度任务'
  },
  'scheduler.delete_task': {
    platforms: {
      telegram: { 
        command: 'schedule_delete',
        aliases: ['sched_del']
      },
      cli: { command: 'schedule delete' },
      api: { endpoint: '/api/schedule/delete' }
    },
    handler: 'SchedulerCommands.handleDeleteTask',
    description: '删除定时任务',
    params: [
      { name: 'id', description: '任务ID', required: true }
    ],
    category: '调度任务'
  },
  'scheduler.enable_task': {
    platforms: {
      telegram: { 
        command: 'schedule_enable',
        aliases: ['sched_on']
      },
      cli: { command: 'schedule enable' },
      api: { endpoint: '/api/schedule/enable' }
    },
    handler: 'SchedulerCommands.handleEnableTask',
    description: '启用定时任务',
    params: [
      { name: 'id', description: '任务ID', required: true }
    ],
    category: '调度任务'
  },
  'scheduler.disable_task': {
    platforms: {
      telegram: { 
        command: 'schedule_disable',
        aliases: ['sched_off']
      },
      cli: { command: 'schedule disable' },
      api: { endpoint: '/api/schedule/disable' }
    },
    handler: 'SchedulerCommands.handleDisableTask',
    description: '禁用定时任务',
    params: [
      { name: 'id', description: '任务ID', required: true }
    ],
    category: '调度任务'
  },
  'scheduler.execute_task': {
    platforms: {
      telegram: { 
        command: 'schedule_execute',
        aliases: ['sched_run'],
        specialHandler: 'showProgress'
      },
      cli: { command: 'schedule execute' },
      api: { endpoint: '/api/schedule/execute' }
    },
    handler: 'SchedulerCommands.handleExecuteTask',
    description: '立即执行定时任务',
    params: [
      { name: 'id', description: '任务ID', required: true }
    ],
    category: '调度任务'
  },
  
  // 基础命令
  'start': {
    platforms: {
      telegram: { command: 'start' }
    },
    handler: 'SystemCommands.handleStart',
    description: '开始使用机器人',
    params: [],
    category: '基础'
  },
  'help': {
    platforms: {
      telegram: { command: 'help' },
      cli: { command: 'help' },
      api: { endpoint: '/api/help' }
    },
    handler: 'SystemCommands.handleHelp',
    description: '显示帮助信息',
    params: [],
    category: '基础'
  },
  
  // 内容相关命令
  'content.generate': {
    platforms: {
      telegram: { 
        command: 'content_generate',
        aliases: ['generate']
      },
      cli: { command: 'content generate' },
      api: { endpoint: '/api/content/generate' }
    },
    handler: 'ContentCommands.handleGenerate',
    description: '生成内容',
    params: [
      { name: 'community', description: '社区标识', required: true },
      { name: 'prompt', description: '提示词', required: false }
    ],
    category: '内容'
  },
  'content.list': {
    platforms: {
      telegram: { 
        command: 'content_list',
        aliases: ['list']
      },
      cli: { command: 'content list' },
      api: { endpoint: '/api/content/list' }
    },
    handler: 'ContentCommands.handleList',
    description: '列出内容',
    params: [
      { name: 'community', description: '社区标识', required: true },
      { name: 'index', description: '序号/ID', required: false }
    ],
    category: '内容'
  },
  
  // 发布相关命令
  'publish.content': {
    platforms: {
      telegram: { command: 'publish' },
      cli: { command: 'publish' },
      api: { endpoint: '/api/publish' }
    },
    handler: 'PublishCommands.handlePublish',
    description: '发布内容',
    params: [
      { name: 'community', description: '社区标识', required: true },
      { name: 'index', description: '内容序号', required: true },
      { name: 'wallet', description: '钱包索引', required: false }
    ],
    category: '发布'
  },
  
  // 钱包相关命令
  'wallet.add': {
    platforms: {
      telegram: { command: 'wallet_add' },
      cli: { command: 'wallet add' },
      api: { endpoint: '/api/wallet/add' }
    },
    handler: 'WalletCommands.addWallet',
    description: '添加钱包',
    params: [
      { name: 'privateKey', description: '私钥', required: true }
    ],
    category: '钱包'
  },
  'wallet.generate': {
    platforms: {
      telegram: { command: 'wallet_generate' },
      cli: { command: 'wallet generate' },
      api: { endpoint: '/api/wallet/generate' }
    },
    handler: 'WalletCommands.generateWallets',
    description: '生成HD钱包',
    params: [
      { name: 'count', description: '钱包数量', required: false },
      { name: 'mnemonic', description: '助记词', required: false }
    ],
    category: '钱包'
  },
  'wallet.list': {
    platforms: {
      telegram: { command: 'wallet_list' },
      cli: { command: 'wallet list' },
      api: { endpoint: '/api/wallet/list' }
    },
    handler: 'WalletCommands.listWallets',
    description: '列出钱包',
    params: [],
    category: '钱包'
  },
  'wallet.delete': {
    platforms: {
      telegram: { command: 'wallet_delete' },
      cli: { command: 'wallet delete' },
      api: { endpoint: '/api/wallet/delete' }
    },
    handler: 'WalletCommands.deleteWallet',
    description: '删除钱包',
    params: [
      { name: 'index', description: '钱包索引', required: true }
    ],
    category: '钱包'
  },
  'wallet.switch': {
    platforms: {
      telegram: { command: 'wallet_switch' },
      cli: { command: 'wallet switch' },
      api: { endpoint: '/api/wallet/switch' }
    },
    handler: 'WalletCommands.switchWallet',
    description: '切换当前钱包',
    params: [
      { name: 'index', description: '钱包索引', required: true }
    ],
    category: '钱包'
  }
};

export default commands; 