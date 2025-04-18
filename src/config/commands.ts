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
    handler: 'SchedulerCommands.addScheduleTask',
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
    handler: 'SchedulerCommands.listScheduleTasks',
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
    handler: 'SchedulerCommands.deleteScheduleTask',
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
    handler: 'SchedulerCommands.enableScheduleTask',
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
    handler: 'SchedulerCommands.disableScheduleTask',
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
    handler: 'SchedulerCommands.executeScheduleTask',
    description: '立即执行定时任务',
    params: [
      { name: 'id', description: '任务ID', required: true }
    ],
    category: '调度任务'
  },
  
  // 调度器管理命令
  'scheduler.status': {
    platforms: {
      telegram: { 
        command: 'scheduler_status',
        aliases: ['sched_status']
      },
      cli: { command: 'scheduler status' },
      api: { endpoint: '/api/scheduler/status' }
    },
    handler: 'SchedulerCommands.getSchedulerStatus',
    description: '查看调度器状态',
    params: [],
    category: '调度任务'
  },
  'scheduler.start': {
    platforms: {
      telegram: { 
        command: 'scheduler_start',
        aliases: ['sched_start']
      },
      cli: { command: 'scheduler start' },
      api: { endpoint: '/api/scheduler/start' }
    },
    handler: 'SchedulerCommands.startScheduler',
    description: '启动调度器',
    params: [],
    category: '调度任务'
  },
  'scheduler.stop': {
    platforms: {
      telegram: { 
        command: 'scheduler_stop',
        aliases: ['sched_stop']
      },
      cli: { command: 'scheduler stop' },
      api: { endpoint: '/api/scheduler/stop' }
    },
    handler: 'SchedulerCommands.stopScheduler',
    description: '停止调度器',
    params: [],
    category: '调度任务'
  },
  'scheduler.update': {
    platforms: {
      telegram: { 
        command: 'scheduler_update',
        aliases: ['sched_update']
      },
      cli: { command: 'scheduler update' },
      api: { endpoint: '/api/scheduler/update' }
    },
    handler: 'SchedulerCommands.updateSchedulerConfig',
    description: '更新调度器配置',
    params: [
      { name: 'interval', description: '执行间隔(分钟)', required: false },
      { name: 'cronExpression', description: 'cron表达式', required: false },
      { name: 'useRandomContent', description: '使用随机内容', required: false }
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
    handler: 'ContentCommands.generateContent',
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
    handler: 'ContentCommands.listContents',
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
  'publish.batch': {
    platforms: {
      telegram: { command: 'batch_publish' },
      cli: { command: 'publish batch' },
      api: { endpoint: '/api/publish/batch' }
    },
    handler: 'PublishCommands.handleBatchPublish',
    description: '批量发布内容',
    params: [
      { name: 'community', description: '社区标识', required: true },
      { name: 'count', description: '发布数量', required: true },
      { name: 'walletIndex', description: '钱包索引', required: false }
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
  'wallet.import_mnemonic': {
    platforms: {
      telegram: { command: 'wallet_import' },
      cli: { command: 'wallet import' },
      api: { endpoint: '/api/wallet/import' }
    },
    handler: 'WalletCommands.importFromMnemonic',
    description: '从助记词导入钱包',
    params: [
      { name: 'mnemonic', description: '助记词', required: true },
      { name: 'count', description: '钱包数量', required: false }
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
  },
  'wallet.multicall_send': {
    platforms: {
      telegram: { command: 'wallet_funding' },
      cli: { command: 'wallet funding' },
      api: { endpoint: '/api/wallet/funding' }
    },
    handler: 'WalletCommands.multicallSendEth',
    description: '批量发送ETH到生成的钱包',
    params: [
      { name: 'privateKey', description: '源钱包私钥', required: true },
      { name: 'amount', description: '每个钱包发送的ETH数量', required: true }
    ],
    category: '钱包'
  },
  'wallet.transfer_all': {
    platforms: {
      telegram: { command: 'wallet_transfer_all' },
      cli: { command: 'wallet transfer-all' },
      api: { endpoint: '/api/wallet/transfer-all' }
    },
    handler: 'WalletCommands.transferAllFunds',
    description: '将所有钱包资产转移到安全地址',
    params: [
      { name: 'targetAddress', description: '目标安全地址', required: true },
      { name: 'minAmount', description: '最小转账金额(ETH)，默认0.001', required: false }
    ],
    category: '钱包'
  },
  'wallet.export': {
    platforms: {
      telegram: { command: 'wallet_export' },
      cli: { command: 'wallet export' },
      api: { endpoint: '/api/wallet/export' }
    },
    handler: 'WalletCommands.exportWallets',
    description: '导出钱包信息',
    params: [
      { name: 'format', description: '导出格式(json/csv)', required: false }
    ],
    category: '钱包'
  },
  
  // 资金管理命令
  'fund.send': {
    platforms: {
      telegram: { command: 'fund_send' },
      cli: { command: 'fund send' },
      api: { endpoint: '/api/fund/send' }
    },
    handler: 'FundCommands.handleSend',
    description: '发送资金',
    params: [
      { name: 'toAddress', description: '接收地址', required: true },
      { name: 'amount', description: '金额', required: true },
      { name: 'walletIndex', description: '钱包索引', required: false }
    ],
    category: '资金'
  },
  'fund.distribute': {
    platforms: {
      telegram: { command: 'fund_distribute' },
      cli: { command: 'fund distribute' },
      api: { endpoint: '/api/fund/distribute' }
    },
    handler: 'FundCommands.handleDistribute',
    description: '向多个钱包分发资金',
    params: [
      { name: 'amount', description: '每个钱包的金额', required: true },
      { name: 'walletIndices', description: '钱包索引列表', required: false }
    ],
    category: '资金'
  },
  'fund.batch_eth': {
    platforms: {
      telegram: { command: 'fund_batch_eth' },
      cli: { command: 'fund batch-eth' },
      api: { endpoint: '/api/fund/batch-eth' }
    },
    handler: 'FundCommands.handleBatchEth',
    description: '批量打ETH到钱包',
    params: [
      { name: 'amount', description: '每个钱包的ETH数量', required: true },
      { name: 'walletList', description: '钱包列表', required: false }
    ],
    category: '资金'
  },
  'fund.balance': {
    platforms: {
      telegram: { command: 'fund_balance' },
      cli: { command: 'fund balance' },
      api: { endpoint: '/api/fund/balance' }
    },
    handler: 'FundCommands.handleBalance',
    description: '查询钱包余额',
    params: [
      { name: 'walletIndex', description: '钱包索引', required: false }
    ],
    category: '资金'
  },
  
  // 链操作命令
  'chain.info': {
    platforms: {
      telegram: { command: 'chain_info' },
      cli: { command: 'chain info' },
      api: { endpoint: '/api/chain/info' }
    },
    handler: 'ChainCommands.handleInfo',
    description: '显示当前链信息',
    params: [],
    category: '链操作'
  }
};

export default commands; 