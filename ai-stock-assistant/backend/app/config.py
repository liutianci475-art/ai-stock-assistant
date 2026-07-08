import os
from pathlib import Path

from dotenv import load_dotenv

# 避免 Windows 系统代理导致 AkShare 请求失败
os.environ.setdefault("NO_PROXY", "*")
for _proxy_key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    os.environ.pop(_proxy_key, None)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# LLM 计费（人民币 / 每百万 token），可在 .env 中按实际服务商调整
LLM_INPUT_PRICE_PER_1M = float(os.getenv("LLM_INPUT_PRICE_PER_1M", "1.0"))
LLM_INPUT_CACHE_HIT_PRICE_PER_1M = float(os.getenv("LLM_INPUT_CACHE_HIT_PRICE_PER_1M", "0.02"))
LLM_OUTPUT_PRICE_PER_1M = float(os.getenv("LLM_OUTPUT_PRICE_PER_1M", "2.0"))

# 低价股筛选：小本金入门默认开启，后期可在 .env 或前端切换
LOW_PRICE_MODE = os.getenv("LOW_PRICE_MODE", "true").lower() in {"1", "true", "yes", "on"}
MAX_STOCK_PRICE = float(os.getenv("MAX_STOCK_PRICE", "30"))
MIN_STOCK_PRICE = float(os.getenv("MIN_STOCK_PRICE", "2.0"))

# 新闻抓取（Day 3）
NEWS_EM_LIMIT = int(os.getenv("NEWS_EM_LIMIT", "5"))
NEWS_NOTICE_LIMIT = int(os.getenv("NEWS_NOTICE_LIMIT", "3"))
NEWS_CLS_MATCH_LIMIT = int(os.getenv("NEWS_CLS_MATCH_LIMIT", "3"))
NEWS_NOTICE_DAYS = int(os.getenv("NEWS_NOTICE_DAYS", "30"))
NEWS_FETCH_CLS = os.getenv("NEWS_FETCH_CLS", "true").lower() in {"1", "true", "yes", "on"}
NEWS_FETCH_XUEQIU = os.getenv("NEWS_FETCH_XUEQIU", "true").lower() in {"1", "true", "yes", "on"}
NEWS_SUMMARY_MAX_CHARS = int(os.getenv("NEWS_SUMMARY_MAX_CHARS", "1200"))

# FastAPI / uvicorn
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# 通知（Day 8）
SERVER_CHAN_KEY = os.getenv("SERVER_CHAN_KEY", "")
