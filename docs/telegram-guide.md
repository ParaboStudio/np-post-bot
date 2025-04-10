# Telegram平台安装和使用指南

## 概述

社区发帖机器人的Telegram平台允许用户通过Telegram消息与机器人交互，实现内容生成、发布和管理。本指南将帮助你设置和使用Telegram平台。

## 前置准备

1. 已安装Node.js (16.x+)和npm
2. 已克隆并安装本项目
3. 拥有一个Telegram账号

## 安装步骤

### 1. 获取Telegram Bot令牌

1. 在Telegram中搜索 `@BotFather` 并开始对话
2. 发送 `/newbot` 命令创建一个新机器人
3. 按照BotFather的指示设置机器人名称和用户名
4. 成功后，BotFather会提供一个API令牌，格式类似：`123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

### 2. 安装必要依赖

在项目目录下运行以下命令安装Telegraf库:

```bash
npm install telegraf @types/node-cron
```

### 3. 配置环境变量

创建或编辑项目根目录下的`.env`文件，添加你的Telegram令牌:

```
TELEGRAM_TOKEN=你的Telegram令牌
```

### 4. 启用Telegram相关代码

打开`src/platforms/telegram-platform.ts`文件，取消注释以下行:

1. 取消注释导入语句:
```typescript
import { Telegraf, Context } from 'telegraf';
```

2. 取消注释类属性:
```typescript
private bot: Telegraf | null = null;
```

3. 取消注释`init`、`start`和`stop`方法中的Telegram bot初始化和操作代码
4. 取消注释`setupCommands`方法中的命令处理代码

### 5. 启动Telegram平台

```bash
npm run telegram
```

或者使用:

```bash
node dist/index.js
```

成功启动后，你会在控制台看到"Telegram平台已启动"的消息。

## 使用方法

### 可用命令

在Telegram中，你可以使用以下命令与机器人交互:

- `/start` - 开始使用机器人
- `/help` - 显示帮助信息
- `/info` - 查看系统信息
- `/content_generate <社区> [提示词]` - 生成内容
- `/content_list [社区]` - 列出内容
- `/publish <社区> <内容ID>` - 发布内容
- `/quick_publish <社区> [提示词]` - 快速生成并发布
- `/status` - 查看调度器状态

### 示例

1. 生成内容:
   ```
   /content_generate ethereum 写一篇关于区块链的短文
   ```

2. 查看内容列表:
   ```
   /content_list ethereum
   ```

3. 发布内容:
   ```
   /publish ethereum 123456
   ```

4. 快速发布:
   ```
   /quick_publish ethereum 分享一个关于web3的想法
   ```

## 配置选项

你可以通过以下环境变量自定义Telegram平台行为:

- `TELEGRAM_TOKEN`: Telegram机器人API令牌（必需）
- `LOG_LEVEL`: 设置日志级别，如'debug'可以查看更详细的日志

## 常见问题

1. **问题**: 机器人不响应命令
   **解决方案**: 确保你的Telegram令牌正确，并且机器人已经成功启动

2. **问题**: 出现"未配置Telegram令牌"错误
   **解决方案**: 检查.env文件中的TELEGRAM_TOKEN环境变量是否正确设置

3. **问题**: 内容生成失败
   **解决方案**: 检查AI服务配置，确保AI_TEXT_ENDPOINT和AI_IMAGE_ENDPOINT环境变量已正确设置

4. **问题**: 发布到区块链失败
   **解决方案**: 检查区块链配置和钱包私钥是否正确设置，以及是否有足够的代币支付Gas费用

## 拓展功能

Telegram平台可以通过以下方式进行拓展:

1. 添加新命令 - 在`setupCommands`方法中添加新的命令处理逻辑
2. 增强消息格式 - 使用Telegram的Markdown或HTML格式美化输出
3. 添加内联按钮 - 使用`Markup.inlineKeyboard`创建交互式按钮
4. 实现会话状态 - 使用Telegraf的会话管理实现多步骤交互

## 部署注意事项

1. 在生产环境部署时，确保设置了正确的Webhook URL或使用长轮询模式
2. 配置健康检查和自动重启机制，确保机器人服务持续可用
3. 考虑使用PM2等进程管理工具维护Telegram机器人进程 