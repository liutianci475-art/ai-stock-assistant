from datetime import date

from fastapi import APIRouter, HTTPException

from app.schemas.portfolio import (
    DailyRoutineResponse,
    HoldingAdvice,
    HoldingCreate,
    HoldingItem,
    HoldingListResponse,
    HoldingsAdviceResponse,
    HoldingUpdate,
    TradeListResponse,
    TradeStats,
)
from app.services.daily_service import run_daily_routine
from app.services.portfolio_service import (
    create_holding,
    delete_holding,
    get_holdings_advice,
    get_trade_stats,
    list_holdings,
    list_trades,
    sell_holding,
    update_holding,
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.post("", response_model=HoldingItem)
async def api_create_holding(data: HoldingCreate):
    try:
        return create_holding(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=HoldingListResponse)
async def api_list_holdings(status: str = "holding"):
    try:
        return list_holdings(status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/holdings-advice", response_model=HoldingsAdviceResponse)
async def api_holdings_advice():
    try:
        items = get_holdings_advice()
        return HoldingsAdviceResponse(items=[HoldingAdvice(**i) for i in items])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{holding_id}", response_model=HoldingItem)
async def api_get_holding(holding_id: int):
    try:
        from app.services.portfolio_service import get_holding_by_id
        return get_holding_by_id(holding_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{holding_id}", response_model=HoldingItem)
async def api_update_holding(holding_id: int, data: HoldingUpdate):
    try:
        return update_holding(holding_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{holding_id}/sell", response_model=HoldingItem)
async def api_sell_holding(holding_id: int, sell_price: float = 0, reason: str = ""):
    try:
        price = sell_price if sell_price > 0 else None
        return sell_holding(holding_id, sell_price=price, reason=reason)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{holding_id}")
async def api_delete_holding(holding_id: int):
    try:
        delete_holding(holding_id)
        return {"status": "ok", "message": f"持仓 {holding_id} 已撤销"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
