"""回测服务：策略回测 + 收益率计算"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import pandas as pd

from app.services.stock_service import get_kline


def _macd_cross_signal(df: pd.DataFrame) -> pd.DataFrame:
    """计算 MACD 金叉/死叉信号。"""
    ema12 = df["close"].ewm(span=12).mean()
    ema26 = df["close"].ewm(span=26).mean()
    dif = ema12 - ema26
    dea = dif.ewm(span=9).mean()
    hist = dif - dea
    df["dif"] = dif
    df["dea"] = dea
    df["hist"] = hist
    df["signal"] = 0
    df.loc[(dif > dea) & (dif.shift(1) <= dea.shift(1)), "signal"] = 1  # 金叉 → 买入
    df.loc[(dif < dea) & (dif.shift(1) >= dea.shift(1)), "signal"] = -1  # 死叉 → 卖出
    return df


def run_backtest(
    code: str,
    days: int = 365,
    initial_cash: float = 100000.0,
    max_positions: int = 1,
) -> Dict[str, Any]:
    """MACD 金叉死叉策略回测。"""
    df = get_kline(code, days=days)
    if df.empty:
        return {"error": f"股票 {code} 无数据"}
    df = _macd_cross_signal(df)

    trades: List[Dict[str, Any]] = []
    cash = initial_cash
    holding = 0.0
    buy_price = 0.0
    peak_value = initial_cash
    max_drawdown = 0.0

    for idx, row in df.iterrows():
        price = float(row["close"])
        date_str = str(row["date"])

        # 金叉买入
        if row["signal"] == 1 and holding == 0 and cash > 0:
            shares = (cash * 0.95) / price
            shares = int(shares / 100) * 100  # 整手
            if shares >= 100:
                cost = shares * price
                cash -= cost
                holding = shares
                buy_price = price
                trades.append({
                    "date": date_str,
                    "type": "买入",
                    "price": round(price, 2),
                    "shares": int(shares),
                    "cost": round(cost, 2),
                    "cash_after": round(cash, 2),
                })

        # 死叉卖出
        elif row["signal"] == -1 and holding > 0:
            revenue = holding * price
            pnl = revenue - (holding * buy_price)
            pnl_pct = (price - buy_price) / buy_price * 100
            cash += revenue
            trades.append({
                "date": date_str,
                "type": "卖出",
                "price": round(price, 2),
                "shares": int(holding),
                "revenue": round(revenue, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "cash_after": round(cash, 2),
            })
            holding = 0
            buy_price = 0.0

        # 更新回撤
        total_value = cash + holding * price
        if total_value > peak_value:
            peak_value = total_value
        drawdown = (peak_value - total_value) / peak_value * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # 最终持仓按市价卖出
    if holding > 0:
        final_price = float(df.iloc[-1]["close"])
        revenue = holding * final_price
        pnl = revenue - (holding * buy_price)
        pnl_pct = (final_price - buy_price) / buy_price * 100
        cash += revenue
        trades.append({
            "date": str(df.iloc[-1]["date"]),
            "type": "平仓",
            "price": round(final_price, 2),
            "shares": int(holding),
            "revenue": round(revenue, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "cash_after": round(cash, 2),
        })

    total_pnl = cash - initial_cash
    total_pnl_pct = total_pnl / initial_cash * 100

    win_trades = [t for t in trades if t.get("pnl", 0) > 0]
    loss_trades = [t for t in trades if t.get("pnl", 0) < 0]

    return {
        "code": code,
        "strategy": "MACD 金叉死叉",
        "period_days": days,
        "initial_cash": initial_cash,
        "final_cash": round(cash, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl_pct, 2),
        "total_trades": len(trades),
        "win_trades": len(win_trades),
        "loss_trades": len(loss_trades),
        "win_rate": round(len(win_trades) / max(len(trades), 1) * 100, 1),
        "max_drawdown_pct": round(max_drawdown, 2),
        "trades": trades[-20:],  # 最近 20 笔
    }
