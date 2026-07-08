import json
import re
from typing import List, Optional

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.prompts.batch_analysis import build_batch_system_prompt
from app.prompts.single_stock import build_single_stock_prompt
from app.schemas.stock import AnalysisResult, IndicatorSnapshot
from app.services.filter_service import passes_price_filter
from app.services.usage_service import build_token_usage


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            result = result[0] if result else {}
        if not isinstance(result, dict):
            raise ValueError(f"JSON 不是对象类型: {type(result).__name__}")
        return result
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("AI 返回内容不是合法 JSON")
        return json.loads(match.group())


def _extract_token_usage(response) -> dict:
    usage = getattr(response, "usage", None)
    if usage is None:
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cache_hit_tokens": 0}
    # DeepSeek 返回 prompt_cache_hit_tokens；OpenAI 兼容格式用 prompt_tokens_details.cached_tokens
    details = getattr(usage, "prompt_tokens_details", None) or {}
    cache_hit = getattr(usage, "prompt_cache_hit_tokens", None)
    if cache_hit is None and isinstance(details, dict):
        cache_hit = details.get("cached_tokens", None)
    if cache_hit is None:
        cache_hit = getattr(details, "cached_tokens", 0) or 0
    return {
        "prompt_tokens": getattr(usage, "prompt_tokens", 0) or 0,
        "completion_tokens": getattr(usage, "completion_tokens", 0) or 0,
        "total_tokens": getattr(usage, "total_tokens", 0) or 0,
        "cache_hit_tokens": cache_hit or 0,
    }


def analyze_stock(
    indicators: IndicatorSnapshot,
    *,
    rule_score: Optional[int] = None,
    passed_rules: Optional[List[str]] = None,
    failed_rules: Optional[List[str]] = None,
    news_summary: Optional[str] = None,
    use_batch_prompt: bool = False,
) -> AnalysisResult:
    if not OPENAI_API_KEY:
        raise ValueError("未配置 OPENAI_API_KEY，请在 backend/.env 中设置")

    prompt = build_single_stock_prompt(
        code=indicators.code,
        name=indicators.name,
        trade_date=indicators.trade_date,
        close_price=f"{indicators.close:.2f}",
        macd_dif=f"{indicators.macd_dif:.4f}",
        macd_dea=f"{indicators.macd_dea:.4f}",
        macd_hist=f"{indicators.macd_hist:.4f}",
        macd_signal=indicators.macd_signal,
        rsi=f"{indicators.rsi:.2f}",
        rsi_signal=indicators.rsi_signal,
        ma5=f"{indicators.ma5:.2f}" if indicators.ma5 is not None else "N/A",
        ma20=f"{indicators.ma20:.2f}" if indicators.ma20 is not None else "N/A",
        ma60=f"{indicators.ma60:.2f}" if indicators.ma60 is not None else "N/A",
        boll_upper=f"{indicators.boll_upper:.2f}" if indicators.boll_upper is not None else "N/A",
        boll_mid=f"{indicators.boll_mid:.2f}" if indicators.boll_mid is not None else "N/A",
        boll_lower=f"{indicators.boll_lower:.2f}" if indicators.boll_lower is not None else "N/A",
        volume=f"{indicators.volume:.0f}",
        kline_summary=indicators.kline_summary,
        indicator_explanation=indicators.indicator_explanation,
        rule_score=rule_score,
        passed_rules=passed_rules,
        failed_rules=failed_rules,
        news_summary=news_summary,
    )

    system_prompt = (
        build_batch_system_prompt()
        if use_batch_prompt or rule_score is not None or news_summary
        else "你是严谨的 A 股投研助手，只返回 JSON。"
    )

    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=60)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content or ""
    parsed = _extract_json(raw)
    token_stats = _extract_token_usage(response)
    token_usage = build_token_usage(
        prompt_tokens=token_stats["prompt_tokens"],
        completion_tokens=token_stats["completion_tokens"],
        model=OPENAI_MODEL,
        cache_hit_tokens=token_stats["cache_hit_tokens"],
    )

    return AnalysisResult(
        code=indicators.code,
        name=indicators.name,
        score=int(parsed["score"]),
        stars=int(parsed["stars"]),
        action=str(parsed["action"]),
        reason=str(parsed["reason"]),
        raw_response=raw,
        token_usage=token_usage,
        close_price=indicators.close,
        passes_price_filter=passes_price_filter(indicators.close),
    )


def analyze_holding(
    indicators: IndicatorSnapshot,
    *,
    news_summary: Optional[str] = None,
    buy_price: float = 0.0,
    current_price: float = 0.0,
    pnl_pct: float = 0.0,
    holding_days: int = 0,
    stop_loss: float = 0.0,
    take_profit: float = 0.0,
) -> AnalysisResult:
    if not OPENAI_API_KEY:
        raise ValueError("未配置 OPENAI_API_KEY，请在 backend/.env 中设置")

    from app.prompts.portfolio_review import build_portfolio_review_prompt

    def _close_vs_ma20(close: float, ma20: Optional[float]) -> str:
        if ma20 is None:
            return "MA20 数据不足"
        diff_pct = (close - ma20) / ma20 * 100
        if diff_pct > 3:
            return f"远在 MA20 之上（+{diff_pct:.1f}%）"
        if diff_pct > 0:
            return f"在 MA20 之上（+{diff_pct:.1f}%）"
        return f"在 MA20 之下（{diff_pct:.1f}%）"

    prompt = build_portfolio_review_prompt(
        code=indicators.code,
        name=indicators.name,
        buy_price=buy_price,
        current_price=current_price,
        pnl_pct=pnl_pct,
        holding_days=holding_days,
        stop_loss=stop_loss,
        take_profit=take_profit,
        dif=f"{indicators.macd_dif:.4f}" if indicators.macd_dif is not None else "N/A",
        dea=f"{indicators.macd_dea:.4f}" if indicators.macd_dea is not None else "N/A",
        hist=f"{indicators.macd_hist:.4f}" if indicators.macd_hist is not None else "N/A",
        macd_signal=indicators.macd_signal,
        rsi=f"{indicators.rsi:.2f}" if indicators.rsi is not None else "N/A",
        rsi_signal=indicators.rsi_signal,
        ma5=f"{indicators.ma5:.2f}" if indicators.ma5 is not None else "N/A",
        ma20=f"{indicators.ma20:.2f}" if indicators.ma20 is not None else "N/A",
        ma60=f"{indicators.ma60:.2f}" if indicators.ma60 is not None else "N/A",
        close_vs_ma20=_close_vs_ma20(indicators.close, indicators.ma20),
        volume=f"{indicators.volume:.0f}",
        news_summary=news_summary,
    )

    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=60)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "你是专业的 A 股分析师，能用大白话给普通股民解释。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content or ""
    parsed = _extract_json(raw)
    token_stats = _extract_token_usage(response)
    token_usage = build_token_usage(
        prompt_tokens=token_stats["prompt_tokens"],
        completion_tokens=token_stats["completion_tokens"],
        model=OPENAI_MODEL,
        cache_hit_tokens=token_stats["cache_hit_tokens"],
    )

    return AnalysisResult(
        code=indicators.code,
        name=indicators.name,
        score=int(parsed["score"]),
        stars=int(parsed["stars"]),
        action=str(parsed["action"]),
        reason=str(parsed["reason"]),
        raw_response=raw,
        token_usage=token_usage,
        close_price=indicators.close,
    )
