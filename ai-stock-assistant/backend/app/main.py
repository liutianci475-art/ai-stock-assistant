from contextlib import asynccontextmanager

import app.config  # noqa: F401
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, backtest, daily_routine, news, portfolio, recommendations, settings, stocks, trades


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="AI Stock Assistant",
    description="A 股 AI 投研助手 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(stocks.router, prefix=API_PREFIX)
app.include_router(analysis.router, prefix=API_PREFIX)
app.include_router(recommendations.router, prefix=API_PREFIX)
app.include_router(news.router, prefix=API_PREFIX)
app.include_router(settings.router, prefix=API_PREFIX)
app.include_router(portfolio.router, prefix=API_PREFIX)
app.include_router(trades.router, prefix=API_PREFIX)
app.include_router(daily_routine.router, prefix=API_PREFIX)
app.include_router(backtest.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "name": "AI Stock Assistant",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
