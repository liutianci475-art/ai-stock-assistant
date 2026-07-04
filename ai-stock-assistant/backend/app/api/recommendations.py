from datetime import date

from fastapi import APIRouter, HTTPException

from app.schemas.stock import RecommendationReport
from app.services.recommend_service import build_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

_cache: dict[str, RecommendationReport] = {}


@router.get("/today", response_model=RecommendationReport)
async def get_today_recommendations(
    candidate_limit: int = 10,
    top_n: int = 5,
    min_rule_score: int = 60,
):
    today = date.today().isoformat()
    if today in _cache:
        return _cache[today]
    try:
        report = build_recommendations(
            candidate_limit=candidate_limit,
            top_n=top_n,
            min_rule_score=min_rule_score,
        )
        _cache[today] = report
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        _cache[date.today().isoformat()] = report
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
