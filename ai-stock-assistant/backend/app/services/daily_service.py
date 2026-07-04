"""每日完整流程编排"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import List, Optional

from app.db import get_connection
from app.schemas.portfolio import DailyReviewResult, DailyRoutineResponse
from app.schemas.usage import TokenUsage
from app.services.ai_service import analyze_stock
from app.services.indicator_service import get_indicator_snapshot
from app.services.news_service import build_news_summary, get_stock_news_bundle
from app.services.notify_service import send_daily_report_message
from app.services.portfolio_service import (
    ensure_tables,
    list_holdings,
    update_current_prices,
)
from app.services.recommend_service import build_recommendations
from app.services.stock_service import get_kline
from app.services.usage_service import build_token_usage


def _compute_close_vs_ma20(close: float, ma20: Optional[float]) -> str:
    if ma20 is None:
        return "MA20 数据不足"
    diff_pct = (close - ma20) / ma20 * 100
    if diff_pct > 3:
        return f"远在 MA20 之上（+{diff_pct:.1f}%）"
    if diff_pct > 0:
        return f"在 MA20 之上（+{diff_pct:.1f}%）"
    return f"在 MA20 之下（{diff_pct:.1f}%）"


def run_daily_routine() -> DailyRoutineResponse:
    ensure_tables()
    today = date.today().isoformat()
    total_token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost_rmb": 0.0}

    # Step 1: Review all holdings
    holdings_list = list_holdings(status="holding")
    reviews: List[DailyReviewResult] = []

    for holding in holdings_list.items:
        try:
            # Update current price
            kline = get_kline(holding.code, days=5)
            if not kline.empty:
                latest_price = float(kline.iloc[-1]["close"])
                update_current_prices(holding.code, latest_price)
            else:
                latest_price = holding.current_price

            # Build a basic analysis
            indicators = get_indicator_snapshot(holding.code, days=80, name=holding.name)
            if indicators:
                # Build a simplified version for portfolio review
                from app.services.ai_service import analyze_stock as ai_analyze
                news_bundle = get_stock_news_bundle(holding.code, holding.name)
                news_summary = build_news_summary(news_bundle)

                result = ai_analyze(
                    indicators,
                    news_summary=news_summary,
                    use_batch_prompt=True,
                )

                # Record daily review
                conn = get_connection()
                try:
                    conn.execute(
                        """INSERT INTO daily_reviews (holding_id, code, review_date, action,
                           score, stars, reason, current_price, pnl_pct, token_usage)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (holding.id, holding.code, today, result.action, result.score,
                         result.stars, result.reason, latest_price,
                         (latest_price - holding.buy_price) / holding.buy_price * 100,
                         json.dumps(result.token_usage.model_dump() if result.token_usage else {})),
                    )
                    conn.commit()
                finally:
                    conn.close()

                # Track token usage
                if result.token_usage:
                    token_usage = result.token_usage
                    total_token_usage["prompt_tokens"] += token_usage.prompt_tokens
                    total_token_usage["completion_tokens"] += token_usage.completion_tokens
                    total_token_usage["total_tokens"] += token_usage.total_tokens
                    total_token_usage["cost_rmb"] += token_usage.cost_rmb

                reviews.append(DailyReviewResult(
                    holding_id=holding.id,
                    code=holding.code,
                    name=holding.name,
                    action=result.action,
                    score=result.score,
                    stars=result.stars,
                    reason=result.reason[:100],
                    current_price=latest_price,
                    pnl_pct=round((latest_price - holding.buy_price) / holding.buy_price * 100, 2),
                ))
        except Exception:
            continue

    # Step 2: Scan new candidates
    try:
        report = build_recommendations(candidate_limit=10, top_n=5, min_rule_score=60)
        new_candidates = report.candidate_count
        new_recommendations = report.count
        if report.usage_summary:
            total_token_usage["prompt_tokens"] += report.usage_summary.prompt_tokens
            total_token_usage["completion_tokens"] += report.usage_summary.completion_tokens
            total_token_usage["total_tokens"] += report.usage_summary.total_tokens
            total_token_usage["cost_rmb"] += report.usage_summary.cost_rmb
    except Exception:
        new_candidates = 0
        new_recommendations = 0

    total_token_usage["cost_rmb"] = round(total_token_usage["cost_rmb"], 6)

    # Step 3: Build recommendation details for notification
    rec_details = []
    if new_recommendations > 0:
        try:
            rec_details = [
                {
                    "code": r.code,
                    "name": r.name,
                    "price": r.close_price or 0,
                    "score": r.score,
                    "action": r.action,
                    "reason": r.reason,
                }
                for r in report.recommendations
            ]
        except Exception:
            rec_details = []

    # Step 4: Send notification
    try:
        send_daily_report_message(
            date_str=today,
            holdings_count=len(reviews),
            recommendations_count=new_recommendations,
            candidate_count=new_candidates,
            total_cost=total_token_usage["cost_rmb"],
            recommendations=rec_details,
        )
    except Exception:
        pass

    return DailyRoutineResponse(
        date=today,
        holdings_reviewed=len(reviews),
        new_candidates=new_candidates,
        new_recommendations=new_recommendations,
        total_token_usage=total_token_usage,
        reviews=reviews,
    )
