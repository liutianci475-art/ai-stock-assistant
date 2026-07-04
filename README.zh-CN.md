# AI Stock Assistant（A 股 AI 投研助手）

每日自动筛选、分析、推荐股票的 AI 投研工具。

## 功能

- **规则引擎** — 全 A 股预筛选至 ~100 只候选（默认低价股模式）
- **AI 深度分析** — 调用 DeepSeek/OpenAI API 分析候选股，每日推荐 5~10 只
- **成本追踪** — 展示 Token 消耗及估算人民币费用
- **网页仪表盘** — Next.js 前端展示推荐、历史记录及持仓管理
- **消息通知** — 支持 ServerChan（微信）和 Telegram 推送
- **多层架构** — 规则预筛选 → AI 分析 → 买卖信号

## 环境要求

- Python 3.10+
- Node.js 18+
- 一个 [DeepSeek](https://platform.deepseek.com) 或其他 OpenAI 兼容的 API 密钥
- （可选）[ServerChan](https://sct.ftqq.com) 密钥用于微信推送

## 快速开始

### 1. 启动后端

```bash
cd ai-stock-assistant/backend
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY 等配置
python run.py
```

API 地址：`http://localhost:8000`

### 2. 启动前端

```bash
cd ai-stock-assistant/frontend
npm install
npm run dev
```

仪表盘地址：`http://localhost:3000`

## 配置说明 (`ai-stock-assistant/backend/.env`)

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | — | LLM API 密钥（DeepSeek/OpenAI） |
| `OPENAI_BASE_URL` | `https://api.deepseek.com/v1` | API 地址 |
| `OPENAI_MODEL` | `deepseek-chat` | 模型名称 |
| `LOW_PRICE_MODE` | `true` | 启用低价股筛选模式 |
| `MAX_STOCK_PRICE` | `30` | 低价股最高价（元） |
| `MIN_STOCK_PRICE` | `2.0` | 低价股最低价（元） |
| `SERVER_CHAN_KEY` | — | ServerChan 推送密钥 |
| `API_HOST` | `0.0.0.0` | 后端监听地址 |
| `API_PORT` | `8000` | 后端端口 |

完整参考见 `ai-stock-assistant/backend/.env.example`。

## 项目结构

```
ai-stock-assistant/
├── backend/          # FastAPI 后端
│   ├── app/          # 业务逻辑
│   ├── data/         # 本地数据文件
│   ├── output/       # 生成输出
│   ├── .env.example  # 环境变量模板
│   └── .env          # 本地配置（已 gitignore）
├── frontend/         # Next.js 前端
│   ├── app/          # 页面和布局
│   ├── components/   # UI 组件
│   └── lib/          # 工具函数
└── README.md
```

## 技术栈

- **后端**：FastAPI、AkShare、pandas、ta、OpenAI SDK
- **前端**：Next.js 16、React 19、Tailwind CSS 4、shadcn/ui、Recharts
- **调度**：n8n（可选）

## 许可证

MIT
