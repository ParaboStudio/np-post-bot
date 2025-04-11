# 配置指南

本系统使用基于文件的配置系统，以替代环境变量，使配置更集中和容易管理。

## 配置文件

系统使用两种配置文件：

1. `default.ts` - 包含默认配置值，不应手动修改
2. `config.json` - 包含自定义配置，会覆盖默认配置值（需手动创建）

## 如何配置

1. 在 `src/config` 目录下创建 `config.json` 文件
2. 参考 `default.ts` 中的配置结构创建 `config.json`
3. 修改 `config.json` 中的值为你的实际配置

示例配置文件：

```json
{
  "BASE_URL": "http://localhost:3000",
  "DEFAULT_CHAIN": "ethereum",
  "DEFAULT_CONTRACT_ADDRESS": "0x1234...",
  "DEFAULT_RPC_URL": "https://mainnet.infura.io/v3/YOUR_KEY",
  "TELEGRAM_TOKEN": "123456:ABC-DEF1234...",
  "LOG_LEVEL": "info",
  "GRAPH_URL": "https://api.thegraph.com/...",
  "GRAPH_API_KEY": "YOUR_API_KEY",
  "AI_TEXT_ENDPOINT": "https://api.openai.com/v1/...",
  "AI_IMAGE_ENDPOINT": "https://api.openai.com/v1/..."
}
```

## 配置项说明

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| BASE_URL | 系统基础URL | http://localhost:3000 |
| DEFAULT_CHAIN | 默认使用的区块链网络 | ethereum |
| DEFAULT_CONTRACT_ADDRESS | 默认合约地址 | (空) |
| DEFAULT_RPC_URL | 默认RPC URL | (空) |
| TELEGRAM_TOKEN | Telegram机器人令牌 | (空) |
| LOG_LEVEL | 日志级别 (debug, info, warn, error) | info |
| GRAPH_URL | Graph API URL | (空) |
| GRAPH_API_KEY | Graph API 密钥 | (空) |
| AI_TEXT_ENDPOINT | AI文本服务端点 | (空) |
| AI_IMAGE_ENDPOINT | AI图像服务端点 | (空) |

## 数据存储

系统默认使用项目目录下的 `tmp` 文件夹存储数据。重启服务器后数据不会丢失，但不建议用于生产环境。

可以通过修改 `src/config/index.ts` 中的 `getDataDirectory` 函数来更改数据存储位置。 