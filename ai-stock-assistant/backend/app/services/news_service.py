from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from typing import List, Optional

import akshare as ak
import pandas as pd
import requests

import app.config  # noqa: F401
from app.config import (
    NEWS_CLS_MATCH_LIMIT,
    NEWS_EM_LIMIT,
    NEWS_FETCH_CLS,
    NEWS_FETCH_XUEQIU,
    NEWS_NOTICE_DAYS,
    NEWS_NOTICE_LIMIT,
    NEWS_SUMMARY_MAX_CHARS,
)
from app.schemas.news import NewsItem, StockNewsBundle

_CLS_CACHE: Optional[pd.DataFrame] = None
_CLS_CACHE_LOCK = threading.Lock()
_XQ_HOT_CACHE: Optional[pd.DataFrame] = None
_XQ_HOT_CACHE_LOCK = threading.Lock()


def _to_xueqiu_symbol(code: str) -> str:
    code = code.zfill(6)
    if code.startswith("6"):
        return f"SH{code}"
    if code.startswith(("8", "4", "9")):
        return f"BJ{code}"
    return f"SZ{code}"


def _truncate(text: str, max_len: int = 200) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _fetch_em_stock_news(code: str, limit: int) -> List[NewsItem]:
    raw = ak.stock_news_em(symbol=code.zfill(6))
    if raw.empty:
        return []

    items: List[NewsItem] = []
    for row in raw.head(limit).itertuples(index=False):
        items.append(
            NewsItem(
                source="东方财富-新闻",
                title=str(getattr(row, "新闻标题", "")),
                content=_truncate(getattr(row, "新闻内容", ""), 220),
                publish_time=str(getattr(row, "发布时间", "")),
                url=str(getattr(row, "新闻链接", "")),
            )
        )
    return items


def _fetch_em_notices(code: str, limit: int) -> List[NewsItem]:
    end = datetime.now().strftime("%Y-%m-%d")
    begin = (datetime.now() - timedelta(days=NEWS_NOTICE_DAYS)).strftime("%Y-%m-%d")
    raw = ak.stock_individual_notice_report(
        security=code.zfill(6),
        begin_date=begin,
        end_date=end,
    )
    if raw.empty:
        return []

    items: List[NewsItem] = []
    for row in raw.head(limit).itertuples(index=False):
        items.append(
            NewsItem(
                source="东方财富-公告",
                title=str(getattr(row, "公告标题", "")),
                content=str(getattr(row, "公告类型", "")),
                publish_time=str(getattr(row, "公告日期", "")),
                url=str(getattr(row, "网址", "")),
            )
        )
    return items


def _load_cls_telegraph() -> pd.DataFrame:
    global _CLS_CACHE
    if _CLS_CACHE is not None:
        return _CLS_CACHE

    with _CLS_CACHE_LOCK:
        if _CLS_CACHE is not None:
            return _CLS_CACHE
        url = "https://www.cls.cn/nodeapi/telegraphList"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data_json = response.json()
        temp_df = pd.DataFrame(data_json["data"]["roll_data"])
        temp_df = temp_df[["title", "content", "ctime"]].copy()
        temp_df["ctime"] = pd.to_datetime(temp_df["ctime"], unit="s", utc=True).dt.tz_convert(
            "Asia/Shanghai"
        )
        temp_df.columns = ["title", "content", "publish_time"]
        _CLS_CACHE = temp_df
    return _CLS_CACHE


def _fetch_cls_for_stock(code: str, name: str, limit: int) -> List[NewsItem]:
    telegraphs = _load_cls_telegraph()
    keywords = {code.zfill(6), name}
    if len(name) >= 2:
        keywords.add(name.replace("*", ""))

    matched: List[NewsItem] = []
    for row in telegraphs.itertuples(index=False):
        text = f"{row.title} {row.content}"
        if not any(keyword and keyword in text for keyword in keywords):
            continue
        matched.append(
            NewsItem(
                source="财联社-电报",
                title=str(row.title),
                content=_truncate(row.content, 220),
                publish_time=str(row.publish_time),
            )
        )
        if len(matched) >= limit:
            break
    return matched


def _load_xueqiu_hot() -> pd.DataFrame:
    global _XQ_HOT_CACHE
    if _XQ_HOT_CACHE is not None:
        return _XQ_HOT_CACHE

    with _XQ_HOT_CACHE_LOCK:
        if _XQ_HOT_CACHE is not None:
            return _XQ_HOT_CACHE
        url = "https://xueqiu.com/service/v5/stock/screener/screen"
        params = {
            "category": "CN",
            "size": "200",
            "order": "desc",
            "order_by": "follow",
            "only_count": "0",
            "page": "1",
        }
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Referer": "https://xueqiu.com/hq",
        }
        response = requests.get(url, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        data_json = response.json()
        _XQ_HOT_CACHE = pd.DataFrame(data_json["data"]["list"])
    return _XQ_HOT_CACHE


def _fetch_xueqiu_hot_for_stock(code: str, name: str) -> List[NewsItem]:
    hot_df = _load_xueqiu_hot()
    if hot_df.empty:
        return []

    xq_symbol = _to_xueqiu_symbol(code)
    matched = hot_df[hot_df["symbol"] == xq_symbol]
    if matched.empty:
        return []

    row = matched.iloc[0]
    follow = row.get("follow", "N/A")
    current = row.get("current", "N/A")
    return [
        NewsItem(
            source="雪球-热度",
            title=f"{name} 位于雪球关注热度榜",
            content=f"雪球 symbol={xq_symbol}，关注度={follow}，现价={current}",
            publish_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    ]


def get_stock_news_bundle(code: str, name: str) -> StockNewsBundle:
    """聚合个股相关新闻，内存拼接，不落库。"""
    items: List[NewsItem] = []

    fetchers = [
        ("em_news", lambda: _fetch_em_stock_news(code, NEWS_EM_LIMIT)),
        ("em_notice", lambda: _fetch_em_notices(code, NEWS_NOTICE_LIMIT)),
    ]
    if NEWS_FETCH_CLS:
        fetchers.append(("cls", lambda: _fetch_cls_for_stock(code, name, NEWS_CLS_MATCH_LIMIT)))
    if NEWS_FETCH_XUEQIU:
        fetchers.append(("xueqiu", lambda: _fetch_xueqiu_hot_for_stock(code, name)))

    for _, fetcher in fetchers:
        try:
            items.extend(fetcher())
        except Exception:
            continue
        time.sleep(0.2)

    return StockNewsBundle(code=code.zfill(6), name=name, items=items)


def build_news_summary(bundle: StockNewsBundle, max_chars: Optional[int] = None) -> str:
    limit = max_chars or NEWS_SUMMARY_MAX_CHARS
    if not bundle.items:
        return "暂无近期相关新闻、公告或舆情。"

    lines: List[str] = []
    for index, item in enumerate(bundle.items, start=1):
        line = (
            f"{index}. [{item.source}] {item.title} "
            f"({item.publish_time}) {item.content}"
        )
        lines.append(line.strip())

    summary = "\n".join(lines)
    if len(summary) <= limit:
        return summary
    return summary[: limit - 3] + "..."


def clear_news_cache() -> None:
    global _CLS_CACHE, _XQ_HOT_CACHE
    _CLS_CACHE = None
    _XQ_HOT_CACHE = None


if __name__ == "__main__":
    bundle = get_stock_news_bundle("600519", "贵州茅台")
    print(f"{bundle.name}({bundle.code}) 共 {bundle.count} 条")
    print(build_news_summary(bundle))
