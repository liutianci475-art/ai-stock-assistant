from __future__ import annotations

import time
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import requests

import app.config  # noqa: F401
from app.schemas.stock import KlineBar, StockSnapshot
from app.services.cache import TTLCache

STOCK_NAMES = {
    "600519": "贵州茅台",
}

_kline_cache = TTLCache(default_ttl=300)

_TENCENT_KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
_TENCENT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


def _tencent_market(code: str) -> str:
    return "sh" if code.startswith("6") else "sz"


def _fetch_kline_from_tencent(code: str, days: int) -> pd.DataFrame:
    """使用腾讯证券 API 获取日 K 线。"""
    market = _tencent_market(code)
    params = {"param": f"{market}{code},day,,,{days},qfq"}
    resp = requests.get(_TENCENT_KLINE_URL, params=params, timeout=15, headers=_TENCENT_HEADERS)
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("code") != 0:
        raise ValueError(f"股票 {code} 腾讯 API 返回错误: {payload.get('msg', 'unknown')}")

    symbol_key = f"{market}{code}"
    stock_data = payload.get("data", {}).get(symbol_key, {})
    klines = stock_data.get("qfqday") or stock_data.get("day")
    if not klines:
        raise ValueError(f"股票 {code} 未获取到 K 线数据")

    rows = []
    for parts in klines:
        if len(parts) < 6:
            continue
        rows.append({
            "date": parts[0],
            "open": float(parts[1]),
            "close": float(parts[2]),
            "high": float(parts[3]),
            "low": float(parts[4]),
            "volume": float(parts[5]),
        })
    if not rows:
        raise ValueError(f"股票 {code} 解析 K 线数据失败")
    return pd.DataFrame(rows)


def get_kline(code: str, days: int = 60, end_date: Optional[datetime] = None) -> pd.DataFrame:
    cache_key = f"kline:{code}:{days}"
    cached = _kline_cache.get(cache_key)
    if cached is not None:
        return cached
    """获取 A 股最近 N 个交易日的日 K 线。"""
    if days <= 0:
        raise ValueError("days 必须大于 0")

    last_error: Optional[Exception] = None
    for attempt in range(3):
        try:
            df = _fetch_kline_from_tencent(code, days)
            if df.empty:
                raise ValueError(f"未获取到股票 {code} 的 K 线数据")
            df = df.tail(days).reset_index(drop=True)
            _kline_cache.set(cache_key, df)
            return df
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))

    raise last_error or RuntimeError(f"获取股票 {code} K 线失败")


def get_stock_snapshot(code: str, days: int = 60) -> StockSnapshot:
    kline = get_kline(code, days=days)
    bars = [KlineBar(**row) for row in kline.to_dict(orient="records")]
    return StockSnapshot(
        code=code,
        name=STOCK_NAMES.get(code, code),
        days=len(bars),
        klines=bars,
    )


if __name__ == "__main__":
    snapshot = get_stock_snapshot("600519", days=60)
    print(f"{snapshot.name}({snapshot.code}) 最近 {snapshot.days} 个交易日 K 线")
    print("最新 5 条:")
    for bar in snapshot.klines[-5:]:
        print(
            f"{bar.date} 开={bar.open:.2f} 高={bar.high:.2f} "
            f"低={bar.low:.2f} 收={bar.close:.2f} 量={bar.volume:.0f}"
        )
