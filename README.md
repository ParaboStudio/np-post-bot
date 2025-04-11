# 社区发帖机器人 (Community Post Bot)

一个功能强大的跨平台社区发帖机器人，支持通过多种钱包向区块链社区自动发布内容。

## 📑 功能概述

- 🤖 支持多平台：Telegram、命令行、API
- 💰 多钱包管理：支持HD钱包批量生成和管理
- 💸 批量资金操作：一键为多钱包发送资金
- 🔄 自动化调度：支持定时发布内容
- 🧠 AI内容生成：集成AI生成发布内容
- ⛓️ 区块链连接：支持主流的EVM兼容区块链

## 🚀 快速开始

### 安装依赖

   ```bash
pnpm install
```

### 配置

1. 在 `src/config` 目录下创建 `config.json` 文件
2. 参考 `default.ts` 中的配置结构，添加必要配置

配置文件示例:
```json
{
  "BASE_URL": "http://localhost:3000",
  "DEFAULT_CHAIN": "base-sepolia",
  "DEFAULT_CONTRACT_ADDRESS": "0x1234...",
  "DEFAULT_RPC_URL": "https://sepolia.base.org",
  "TELEGRAM_TOKEN": "123456:ABC-DEF1234...",
  "LOG_LEVEL": "info"
}
```

### 启动应用

   ```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start

# Windows环境启动 
bot.cmd

# Unix环境启动
./bot.sh
```

## 💡 主要功能

### 钱包管理

- **生成HD钱包**：从单个助记词派生多个钱包
  ```
  /wallet_generate 20
  ```

- **钱包批量充值**：使用外部钱包私钥向所有生成的钱包发送ETH
  ```
  /wallet_funding 0x私钥 0.01
  ```
  ⚠️ **安全警告**：此命令需要直接在参数中提供私钥，请在私聊环境中使用，使用后清除聊天记录

- **钱包列表查看**
  ```
  /wallet_list
  ```

- **添加钱包**
  ```
  /wallet_add 0x...
  ```

- **删除钱包**
  ```
  /wallet_delete 1
  ```

- **切换当前钱包**
  ```
  /wallet_switch 2
  ```

- **导出钱包信息**
  ```
  /wallet_export
  ```

### 资金管理

- **查询钱包余额**
  ```
  /fund_balance 1
  ```

- **发送资金**：从指定钱包索引向目标地址发送ETH
  ```
  /fund_send 0x123... 0.01 1
  ```

- **向多个钱包分发资金**：从当前钱包向多个目标钱包转账指定金额
  ```
  /fund_distribute 0.01 1,2,3,4
  ```

- **批量打ETH到钱包**：从当前钱包向指定地址或钱包索引列表转账
  ```
  /fund_batch_eth 0.01 1,2,3,4
```

### 内容管理

- **生成内容**
  ```
  /content_generate namepump 话题关键词
  ```

- **内容列表**
  ```
  /content_list namepump
  ```

### 发布管理

- **发布内容**
  ```
  /publish namepump 1 1
  ```

- **批量发布**
  ```
  /batch_publish namepump 5 1
  ```

### 调度任务

- **添加定时任务**
  ```
  /schedule_add time=08:00 community=namepump count=5 interval=30
  ```

- **任务列表**
  ```
  /schedule_list
  ```

- **启用/禁用任务**
  ```
  /schedule_enable 1
  /schedule_disable 1
  ```

- **立即执行任务**
  ```
  /schedule_execute 1
  ```

### 区块链操作

- **查看当前链信息**
  ```
  /chain_info
  ```

## 📋 平台使用说明

### Telegram 机器人

1. 使用BotFather创建机器人并获取TOKEN
2. 配置TELEGRAM_TOKEN到config.json
3. 启动应用，向您的机器人发送 `/start` 命令
4. 使用 `/help` 查看所有可用命令

### 命令行界面 (CLI)

通过命令行直接使用所有功能：

```bash
# 生成钱包
pnpm cli wallet generate --count 20

# 批量发送ETH
pnpm cli wallet funding --privateKey 0x... --amount 0.01

# 查看帮助
pnpm cli help
```

### API 接口

启动应用后，可通过HTTP API访问所有功能：

```bash
# 生成钱包
curl -X POST http://localhost:3000/api/wallet/generate -H "Content-Type: application/json" -d '{"count": 20}'

# 批量发送ETH
curl -X POST http://localhost:3000/api/wallet/funding -H "Content-Type: application/json" -d '{"privateKey": "0x...", "amount": "0.01"}'
```

## 📌 重要特性

### HD钱包生成

从单个助记词派生多个钱包，便于批量管理：

```
/wallet_generate 20
```

系统会生成助记词和20个派生钱包。**务必保存助记词**，它是恢复这些钱包的唯一方式。

### 批量资金操作

使用当前钱包为多个目标钱包发送ETH或收集资金：

```
# 批量发送ETH到多个钱包（从当前钱包转出）
/fund_batch_eth 0.01 1,2,3,4

# 从当前钱包向指定索引的钱包分发资金
/fund_distribute 0.01 1,2,3,4

# 将所有钱包资金转移到安全地址，自动扣除gas费用(含足够安全余量)，处理多个钱包时会有1秒延迟以避免RPC限流
/wallet_transfer_all 0x123...

# 使用外部钱包批量充值（需提供私钥）
/wallet_funding 0x私钥 0.01
```

⚠️ **安全警告**：`wallet_funding`命令需要在参数中直接提供私钥，使用时务必注意保护私钥安全。

**命令说明**：
- `fund_distribute`：从**当前选择的钱包**向指定索引的钱包转账
- `fund_batch_eth`：从**当前选择的钱包**向指定的钱包地址或索引列表转账
- `wallet_transfer_all`：将**所有钱包**的资金转移到安全地址，自动扣除gas费用(含足够安全余量)，处理多个钱包时会有1秒延迟以避免RPC限流
- `wallet_funding`：使用**外部私钥**向已生成的钱包发送ETH

特点：
- 支持同时向多个钱包发送资金
- 可以设置最小转账金额，避免消耗过多gas
- 自动计算所需资金和gas费用

## 🛠️ 系统架构

- **模块化设计**：所有功能被组织为独立模块
- **统一命令系统**：所有平台共享相同的命令定义
- **可扩展性**：易于添加新功能和新平台支持
- **配置驱动**：通过配置文件轻松定制功能

## 📝 配置项说明

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| DATA_DIR | 数据存储目录 | 项目根目录下的tmp |
| BASE_URL | 系统基础URL | https://sepolia.namepump.com |
| DEFAULT_CHAIN | 默认使用的区块链网络 | base-sepolia |
| DEFAULT_CONTRACT_ADDRESS | 默认合约地址 | 0xc5e5807294a071423a6aA413cEF9efb189B08Dbc |
| DEFAULT_RPC_URL | 默认RPC URL | https://sepolia.base.org |
| TELEGRAM_TOKEN | Telegram机器人令牌 | - |
| LOG_LEVEL | 日志级别 (debug, info, warn, error) | ERROR |

## 🔧 高级使用

### 添加新命令

所有命令都在 `src/config/commands.ts` 中集中定义，添加新命令只需：

1. 在相应的命令处理模块中实现功能
2. 在commands.ts中添加命令定义
3. 重启应用即可在所有平台使用

### 调整区块链参数

若需要使用不同的区块链网络，请修改配置文件：

```json
{
  "DEFAULT_CHAIN": "ethereum",
  "DEFAULT_CONTRACT_ADDRESS": "0x新合约地址",
  "DEFAULT_RPC_URL": "https://ethereum-rpc.com"
}
```

注意：更改区块链配置后需要重启应用

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交问题和Pull Requests，一起改进这个项目！