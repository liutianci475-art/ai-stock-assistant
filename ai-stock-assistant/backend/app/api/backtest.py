from fastapi import APIRouter, HTTPException

from app.services.backtest_service import run_backtest

router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.get("/{code}")
async def backtest(
    code: str,
    strategy: str = "macd_cross",
    days: int = 365,
    initial_cash: float = 100000.0,
):
    try:
        result = run_backtest(code, strategy=strategy, days=days, initial_cash=initial_cash)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
