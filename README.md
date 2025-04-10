# 社区发帖机器人（Community Posting Bot）

## 项目介绍

该项目是一个功能强大的社区发帖机器人，支持自动化内容生成与发布到多个社区。主要功能包括：

- 基于AI的内容生成
- 内容发布到区块链社区
- 支持多链配置（默认支持Base Sepolia）
- 用户和钱包管理（每个用户可拥有多个钱包）
- 多平台支持：CLI命令行、Telegram机器人、HTTP API
- 调度功能，支持定时和crontab模式自动发布
- 系统诊断和健康检查功能
- 临时目录版本化存储，支持无数据库服务器部署

## 安装说明

### 前置要求

- Node.js 16.x 或更高版本
- npm 或 yarn
- 对于Telegram平台：需要从BotFather获取Telegram令牌

### 安装步骤

1. 克隆项目并进入项目目录
   ```bash
   git clone [项目地址]
   cd np-interface
   ```

2. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 构建项目
   ```bash
   npm run build
   # 或
   yarn build
   ```

4. 配置环境变量，创建.env文件
   ```bash
   # 基础配置
   DATA_DIR=./data
   BASE_URL=http://localhost:3000
   
   # Telegram配置（如果使用Telegram平台）
   TELEGRAM_TOKEN=your_telegram_token
   
   # 区块链配置
   DEFAULT_CHAIN=base-sepolia
   DEFAULT_CONTRACT_ADDRESS=your_contract_address
   DEFAULT_RPC_URL=your_rpc_url
   ```

5. 全局安装（可选，推荐）
   ```bash
   npm link
   # 或
   cd apps/bot && npm link
   ```

## 多平台说明

本项目支持三种平台接口，可以根据需要同时或单独使用：

### 1. CLI平台

命令行界面，适合本地使用或自动化脚本。

### 2. Telegram平台

Telegram机器人界面，适合用户直接在Telegram中交互使用。
需要配置`TELEGRAM_TOKEN`环境变量。

### 3. API平台

HTTP API接口，适合集成到Web应用或第三方服务。
默认在3000端口提供服务。

## 使用方法

### CLI命令行方式

可以通过以下方式使用CLI：

1. 如果全局安装了命令：
   ```bash
   np-bot --help
   np-bot system --info
   ```

2. 使用提供的脚本：
   ```bash
   # Unix/Linux/Mac
   ./bot.sh --help
   
   # Windows
   bot.cmd --help
   ```

3. 通过npm scripts:
   ```bash
   npm run cli -- --help
   npm run cli -- user --list
   ```

### Telegram机器人方式

1. 配置Telegram令牌：
   在.env文件中设置`TELEGRAM_TOKEN=your_token`

2. 启动Telegram服务：
   ```bash
   npm run telegram
   ```

3. 在Telegram中与你的机器人交互，可用命令包括：
   - `/start` - 开始使用
   - `/help` - 显示帮助
   - `/info` - 查看系统信息
   - `/content_generate <社区> [提示词]` - 生成内容
   - `/publish <社区> <内容ID>` - 发布内容
   - `/quick_publish <社区> [提示词]` - 快速发布
   - `/status` - 查看调度器状态

### API服务器方式

1. 启动API服务器：
   ```bash
   npm run api
   ```

2. API端点说明：
   - `GET /api/health` - 健康检查
   - `GET /api/system/info` - 系统信息
   - `GET /api/system/diagnose` - 系统诊断
   - `GET /api/content/list?ensLabel=xxx` - 内容列表
   - `POST /api/content/generate` - 生成内容
   - `POST /api/publish` - 发布内容
   - `GET /api/scheduler/status` - 调度器状态
   - `POST /api/scheduler/update` - 更新调度器配置

3. API请求示例：
   ```bash
   # 健康检查
   curl http://localhost:3000/api/health
   
   # 生成内容
   curl -X POST http://localhost:3000/api/content/generate \
     -H "Content-Type: application/json" \
     -d '{"ensLabel":"coolcommunity","prompt":"写一篇关于Web3的短文"}'
   
   # 发布内容
   curl -X POST http://localhost:3000/api/publish \
     -H "Content-Type: application/json" \
     -d '{"ensLabel":"coolcommunity","contentId":"123"}'
   ```

## 主要命令

### 系统管理

```bash
# 显示系统信息
np-bot system --info

# 运行系统诊断
np-bot system --diag

# 显示版本信息
np-bot system --version
```

### 用户管理

```bash
# 列出所有用户
np-bot user --list

# 添加新用户（可选择同时添加钱包）
np-bot user --add <私钥> <用户名>

# 切换当前用户
np-bot user --switch <用户名>
```

### 内容管理

```bash
# 生成内容
np-bot content --generate <社区标签> [提示词]

# 添加内容
np-bot content --add <社区标签> [文本]

# 列出内容
np-bot content --list [社区标签]

# 删除内容
np-bot content --delete <内容ID>
```

### 发布内容

```bash
# 发布已有内容
np-bot publish --ensLabel <社区标签> --contentId <内容ID> [--wallet <钱包索引>]

# 快速生成并发布
np-bot publish --quick <社区标签> [文本] [--wallet <钱包索引>]
```

### 调度器管理

```bash
# 查看调度器状态
np-bot scheduler --status

# 启动调度器
np-bot scheduler --start

# 停止调度器
np-bot scheduler --stop

# 配置调度器（间隔模式）
np-bot scheduler --interval <分钟> --ensLabels <社区标签列表>

# 配置调度器（crontab模式）
np-bot scheduler --cron "0 */6 * * *" --ensLabels <社区标签列表>
```

## 临时存储和版本管理

系统在生产环境中使用版本化的临时目录进行数据存储：

- 开发环境：使用配置的`DATA_DIR`目录
- 生产环境：使用`/tmp/np-bot-data_v{VERSION}`目录

这种设计有以下优势：
- 无需数据库依赖，简化部署
- 适合无状态的serverless环境
- 通过版本号管理可避免不同版本间的数据冲突

注意：临时目录数据不保证持久性，服务重启可能导致数据丢失。

## 平台架构

系统采用统一的平台架构设计，主要组件包括：

1. **平台接口（Platform Interface）**：定义所有平台需实现的通用接口
   - CliPlatform：命令行界面实现
   - TelegramPlatform：Telegram机器人实现
   - ApiPlatform：HTTP API实现

2. **平台管理器（Platform Manager）**：管理所有平台实例的生命周期
   - 注册平台
   - 初始化平台
   - 启动/停止平台

3. **命令路由器（Command Router）**：统一处理来自不同平台的命令请求
   - 注册命令处理器
   - 路由命令到对应处理函数

4. **服务层（Services）**：提供核心业务逻辑
   - UserService：用户管理
   - FileService：文件操作
   - PostingService：内容发布
   - SchedulerService：调度管理

这种架构设计实现了高度的代码复用，同时支持多平台扩展。

## 部署说明

### Vercel部署

本项目支持在Vercel上部署API服务，配置说明：

1. 构建命令：`cd apps/bot && npm install && npm run build`
2. 输出目录：`apps/bot/dist`
3. 入口文件：`apps/bot/dist/api.js`
4. 环境变量：设置必要的环境变量

### 使用Docker部署

提供了Dockerfile用于容器化部署：

```bash
docker build -t community-posting-bot .
docker run -p 3000:3000 -e NODE_ENV=production community-posting-bot
```

## 环境变量配置

项目支持通过环境变量或.env文件配置：

- `NODE_ENV` - 运行环境（development/production）
- `DATA_DIR` - 数据目录路径（在production模式下使用/tmp+版本目录）
- `BASE_URL` - API基础URL
- `VERSION` - 版本号（可选，默认从package.json获取）
- `TELEGRAM_TOKEN` - Telegram机器人令牌
- `DEFAULT_CHAIN` - 默认区块链
- `DEFAULT_CONTRACT_ADDRESS` - 默认合约地址
- `DEFAULT_RPC_URL` - 默认RPC URL
- `LOG_LEVEL` - 日志级别（debug/info/warn/error）

## 拓展和定制

本项目设计了灵活的架构，可以通过以下方式进行拓展：

1. 添加新平台：
   - 实现Platform接口
   - 在platformManager中注册新平台

2. 添加新命令：
   - 创建新的CommandModule实现
   - 在CommandRouter中注册新命令

3. 添加新服务：
   - 创建新的Service类
   - 在ServiceContainer中注册新服务

## 依赖包说明

主要依赖包：
- `commander`: CLI命令解析
- `telegraf`: Telegram机器人API
- `node-cron`: 定时任务调度
- `winston`: 日志记录
- `ethers`: 以太坊交互
- `axios`: HTTP请求
- `dotenv`: 环境变量管理

## 许可证

ISC许可证 