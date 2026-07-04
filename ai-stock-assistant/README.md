# AI Stock Assistant

An AI-powered A-share stock research assistant. Automatically filters, analyzes, and recommends stocks daily.

## Features

- **Rule Engine** — Filters all A-shares to ~100 candidates (low-price mode by default)
- **AI Deep Analysis** — DeepSeek/OpenAI API analyzes each candidate, recommends 5~10 daily picks
- **Cost Tracking** — Displays token usage and estimated RMB cost
- **Web Dashboard** — Next.js frontend showing recommendations, history, and portfolio tracking
- **Notifications** — WeChat (ServerChan) and Telegram push
- **Multi-tier Architecture** — Rule pre-filter → AI analysis → buy/sell signals

## Prerequisites

- Python 3.10+
- Node.js 18+
- An API key from [DeepSeek](https://platform.deepseek.com) or any OpenAI-compatible provider
- (Optional) [ServerChan](https://sct.ftqq.com) key for WeChat notifications

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY and other config
python run.py
```

The API will be available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

## Configuration (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Your LLM API key (DeepSeek/OpenAI) |
| `OPENAI_BASE_URL` | `https://api.deepseek.com/v1` | API base URL |
| `OPENAI_MODEL` | `deepseek-chat` | Model name |
| `LOW_PRICE_MODE` | `true` | Enable low-price stock filtering |
| `MAX_STOCK_PRICE` | `30` | Max stock price in low-price mode (CNY) |
| `MIN_STOCK_PRICE` | `2.0` | Min stock price in low-price mode (CNY) |
| `SERVER_CHAN_KEY` | — | ServerChan push key for WeChat |
| `API_HOST` | `0.0.0.0` | Backend bind address |
| `API_PORT` | `8000` | Backend port |

Full reference in `backend/.env.example`.

## Project Structure

```
ai-stock-assistant/
├── backend/          # FastAPI backend
│   ├── app/          # Application logic
│   ├── data/         # Local data files
│   ├── output/       # Generated output
│   ├── .env.example  # Environment template
│   └── .env          # Local config (gitignored)
├── frontend/         # Next.js dashboard
│   ├── app/          # Pages & layout
│   ├── components/   # UI components
│   └── lib/          # Utilities
└── README.md
```

## Tech Stack

- **Backend**: FastAPI, AkShare, pandas, ta, OpenAI SDK
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Recharts
- **Scheduling**: n8n (optional)

## License

MIT
