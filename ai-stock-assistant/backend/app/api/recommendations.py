from datetime import date
import json

from fastapi import APIRouter, HTTPException

from app.db import get_connection
from app.schemas.stock import AgentDetail, RecommendationItem, RecommendationReport
from app.schemas.usage import TokenUsage
from app.services.recommend_service import build_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _build_report_from_rows(rows: list, today: str) -> RecommendationReport:
    recommendations = []
    total_usage = TokenUsage()
    for row in rows:
        agent_details = []
        raw_json = row["agent_details_json"]
        if raw_json:
            try:
                agent_details = [AgentDetail(**a) for a in json.loads(raw_json)]
            except Exception:
                agent_details = []

        tu = TokenUsage(
            prompt_tokens=row["prompt_tokens"] or 0,
            completion_tokens=row["completion_tokens"] or 0,
            total_tokens=row["total_tokens"] or 0,
            cost_rmb=row["cost_rmb"] or 0.0,
        )
        total_usage = total_usage.merge(tu)

        recommendations.append(RecommendationItem(
            rank=row["rank"],
            code=row["code"],
            name=row["name"],
            close_price=row["close_price"],
            score=row["score"],
            stars=row["stars"],
            action=row["action"],
            reason=row["reason"],
            rule_score=row["rule_score"],
            news_count=row["news_count"],
            target_price=row["target_price"],
            stop_loss_price=row["stop_loss_price"],
            agent_details=agent_details,
            token_usage=tu,
        ))
    return RecommendationReport(
        date=today,
        filter_mode={},
        candidate_count=len(rows),
        analyzed_count=len(rows),
        count=len(recommendations),
        usage_summary=total_usage,
        recommendations=recommendations,
    )


@router.get("/today", response_model=RecommendationReport)
async def get_today_recommendations(
    candidate_limit: int = 10,
    top_n: int = 5,
    min_rule_score: int = 60,
):
    today = date.today().isoformat()

    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM recommendation WHERE recommend_date = ? ORDER BY rank",
            (today,),
        ).fetchall()
    finally:
        conn.close()

    if rows:
        return _build_report_from_rows(rows, today)

    from app.schemas.usage import TokenUsage
    return RecommendationReport(
        date=today,
        filter_mode={},
        candidate_count=0,
        analyzed_count=0,
        count=0,
        usage_summary=TokenUsage(),
        recommendations=[],
    )


@router.post("/today", response_model=RecommendationReport)
async def refresh_today_recommendations(
    candidate_limit: int = 10,
    top_n: int = 5,
    min_rule_score: int = 60,
):
    try:
        report = build_recommendations(
            candidate_limit=candidate_limit,
            top_n=top_n,
            min_rule_score=min_rule_score,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist to DB so GET /today returns the new data
    if report.count > 0:
        try:
            today = date.today().isoformat()
            conn = get_connection()
            conn.execute("DELETE FROM recommendation WHERE recommend_date = ?", (today,))
            for item in report.recommendations:
                agent_json = json.dumps([a.model_dump() for a in item.agent_details], ensure_ascii=False)
                tu = item.token_usage or TokenUsage()
                conn.execute(
                    """INSERT INTO recommendation
                       (recommend_date, code, name, rank, score, stars, action, reason,
                        rule_score, news_count, close_price, target_price, stop_loss_price,
                        agent_details_json, prompt_tokens, completion_tokens, total_tokens, cost_rmb)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (today, item.code, item.name, item.rank, item.score, item.stars,
                     item.action, item.reason, item.rule_score, item.news_count,
                     item.close_price, item.target_price, item.stop_loss_price,
                     agent_json, tu.prompt_tokens, tu.completion_tokens, tu.total_tokens, tu.cost_rmb),
                )
            conn.commit()
            conn.close()
        except Exception:
            pass

    return report
