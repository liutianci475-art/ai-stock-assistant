"""回测服务：策略回测 + 收益率计算 + K线标记 + 资金曲线"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.services.indicator_service import calculate_indicators
from app.services.stock_service import get_kline

# ---------------------------------------------------------------------------
# 策略信号函数
# 每个函数返回 (buy: pd.Series[bool], sell: pd.Series[bool])
# 共用同一个经过 calculate_indicators() 增强的 DataFrame
# ---------------------------------------------------------------------------

STRATEGY_NAMES = {
    "macd_cross": "MACD 金叉死叉",
    "multi_indicator": "多指标共振",
    "boll_breakout": "布林带突破",
    "ma_trend": "均线趋势跟踪",
}


def _macd_cross_signal(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """MACD 金叉买、死叉卖。"""
    dif = df["macd_dif"]
    dea = df["macd_dea"]
    buy = (dif > dea) & (dif.shift(1) <= dea.shift(1))
    sell = (dif < dea) & (dif.shift(1) >= dea.shift(1))
    return buy.fillna(False), sell.fillna(False)


def _multi_indicator_signal(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """多指标共振：复用 rule_engine 的 7 条规则逻辑。"""
    vol_ma20 = df["volume"].rolling(20).mean()
    prev_hist = df["macd_hist"].shift(1)

    buy = (
        (df["close"] > df["ma20"])
        & (df["ma20"] >= df["ma60"] * 0.98)
        & (df["rsi"] > 30) & (df["rsi"] < 70)
        & ((df["macd_hist"] > 0) | (df["macd_hist"] > prev_hist))
        & (df["volume"] >= vol_ma20 * 1.05)
    )
    sell = (
        (df["rsi"] >= 70)
        | ((df["close"] < df["ma20"]) & (df["macd_hist"] < prev_hist))
    )
    return buy.fillna(False), sell.fillna(False)


def _boll_breakout_signal(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """布林带突破：跌破下轨后反弹买入，触上轨或 RSI 超买卖出。"""
    prev_close = df["close"].shift(1)
    prev_lower = df["boll_lower"].shift(1)
    # 买入：前一天收盘低于下轨，当天收盘回升到下轨之上（反弹确认）
    buy = (prev_close < prev_lower) & (df["close"] >= df["boll_lower"])
    # 卖出：收盘价触上轨 或 RSI 超买
    sell = (df["close"] >= df["boll_upper"]) | (df["rsi"] >= 70)
    return buy.fillna(False), sell.fillna(False)


def _ma_trend_signal(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """均线趋势：MA5 上穿 MA20 且价格在 MA20 上方买入，MA5 下穿 MA20 或跌破 MA20 卖出。"""
    prev_ma5 = df["ma5"].shift(1)
    prev_ma20 = df["ma20"].shift(1)
    buy = (df["ma5"] > df["ma20"]) & (prev_ma5 <= prev_ma20) & (df["close"] > df["ma20"])
    sell = ((df["ma5"] < df["ma20"]) & (prev_ma5 >= prev_ma20)) | (df["close"] < df["ma20"])
    return buy.fillna(False), sell.fillna(False)


STRATEGY_FUNCTIONS = {
    "macd_cross": _macd_cross_signal,
    "multi_indicator": _multi_indicator_signal,
    "boll_breakout": _boll_breakout_signal,
    "ma_trend": _ma_trend_signal,
}

# ---------------------------------------------------------------------------
# 模拟交易引擎（所有策略共用）
# ---------------------------------------------------------------------------


def _simulate_trades(
    df: pd.DataFrame,
    buy_mask: pd.Series,
    sell_mask: pd.Series,
    initial_cash: float,
) -> Dict[str, Any]:
    """根据买卖信号模拟交易，返回 trades / equity_curve / max_drawdown。"""
    trades: List[Dict[str, Any]] = []
    equity_curve: List[Dict[str, Any]] = []
    signals: List[Dict[str, Any]] = []

    cash = initial_cash
    holding = 0.0
    buy_price = 0.0
    peak_value = initial_cash
    max_drawdown = 0.0

    for idx, row in df.iterrows():
        price = float(row["close"])
        date_str = str(row["date"])

        # 金叉买入
        if buy_mask.iloc[idx] and holding == 0 and cash > 0:
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
                    "price": round(price, 3),
                    "shares": int(shares),
                    "cost": round(cost, 2),
                    "cash_after": round(cash, 2),
                })
                signals.append({"date": date_str, "type": "buy", "price": round(price, 3)})

        # 死叉卖出
        elif sell_mask.iloc[idx] and holding > 0:
            revenue = holding * price
            pnl = revenue - (holding * buy_price)
            pnl_pct = (price - buy_price) / buy_price * 100
            cash += revenue
            trades.append({
                "date": date_str,
                "type": "卖出",
                "price": round(price, 3),
                "shares": int(holding),
                "revenue": round(revenue, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "cash_after": round(cash, 2),
            })
            signals.append({"date": date_str, "type": "sell", "price": round(price, 3)})
            holding = 0
            buy_price = 0.0

        # 记录资金曲线
        total_value = cash + holding * price
        equity_curve.append({"date": date_str, "value": round(total_value, 2)})

        # 更新回撤
        if total_value > peak_value:
            peak_value = total_value
        drawdown = (peak_value - total_value) / peak_value * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # 最终持仓按市价平仓
    if holding > 0:
        final_price = float(df.iloc[-1]["close"])
        revenue = holding * final_price
        pnl = revenue - (holding * buy_price)
        pnl_pct = (final_price - buy_price) / buy_price * 100
        cash += revenue
        trades.append({
            "date": str(df.iloc[-1]["date"]),
            "type": "平仓",
            "price": round(final_price, 3),
            "shares": int(holding),
            "revenue": round(revenue, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "cash_after": round(cash, 2),
        })
        signals.append({"date": str(df.iloc[-1]["date"]), "type": "sell", "price": round(final_price, 3)})

    return {
        "trades": trades,
        "signals": signals,
        "equity_curve": equity_curve,
        "final_cash": round(cash, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
    }


# ---------------------------------------------------------------------------
# 基准计算（买入持有）
# ---------------------------------------------------------------------------


def _compute_benchmark(df: pd.DataFrame, initial_cash: float) -> Dict[str, Any]:
    """计算买入持有基准：如果从头到尾一直拿着不动。"""
    first_close = float(df.iloc[0]["close"])
    last_close = float(df.iloc[-1]["close"])
    shares = int(initial_cash / first_close / 100) * 100  # 整手
    if shares < 100:
        shares = 0
    cost = shares * first_close
    final_value = shares * last_close + (initial_cash - cost)
    return_pct = (final_value - initial_cash) / initial_cash * 100

    return {
        "initial_investment": round(initial_cash, 2),
        "shares_bought": int(shares),
        "avg_cost": round(first_close, 3),
        "final_value": round(final_value, 2),
        "total_return_pct": round(return_pct, 2),
    }


# ---------------------------------------------------------------------------
# K线数据格式化（供前端图表使用）
# ---------------------------------------------------------------------------


def _format_kline(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """将 DataFrame 转为前端 lightweight-charts 可用的 K 线数组。"""
    result = []
    for _, row in df.iterrows():
        result.append({
            "date": str(row["date"]),
            "open": round(float(row["open"]), 3),
            "high": round(float(row["high"]), 3),
            "low": round(float(row["low"]), 3),
            "close": round(float(row["close"]), 3),
            "volume": float(row["volume"]),
        })
    return result


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------


def run_backtest(
    code: str,
    strategy: str = "macd_cross",
    days: int = 365,
    initial_cash: float = 100000.0,
) -> Dict[str, Any]:
    """策略回测主函数。"""
    if strategy not in STRATEGY_FUNCTIONS:
        return {"error": f"未知策略: {strategy}，可选: {', '.join(STRATEGY_FUNCTIONS.keys())}"}

    df = get_kline(code, days=days)
    if df.empty:
        return {"error": f"股票 {code} 无数据"}

    # 统一计算所有指标（和推荐系统共用同一个调用）
    df = calculate_indicators(df)

    # 生成策略信号
    signal_func = STRATEGY_FUNCTIONS[strategy]
    buy_mask, sell_mask = signal_func(df)

    # 模拟交易
    sim = _simulate_trades(df, buy_mask, sell_mask, initial_cash)

    # 基准
    benchmark = _compute_benchmark(df, initial_cash)

    # 统计
    trades = sim["trades"]
    win_trades = [t for t in trades if t.get("pnl", 0) > 0]
    loss_trades = [t for t in trades if t.get("pnl", 0) < 0]

    total_pnl = sim["final_cash"] - initial_cash
    total_pnl_pct = total_pnl / initial_cash * 100

    return {
        "code": code,
        "strategy": STRATEGY_NAMES[strategy],
        "strategy_key": strategy,
        "period_days": days,
        "initial_cash": initial_cash,
        "final_cash": sim["final_cash"],
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl_pct, 2),
        "total_trades": len(trades),
        "win_trades": len(win_trades),
        "loss_trades": len(loss_trades),
        "win_rate": round(len(win_trades) / max(len(trades), 1) * 100, 1),
        "max_drawdown_pct": sim["max_drawdown_pct"],
        "trades": trades[-30:],
        "kline": _format_kline(df),
        "signals": sim["signals"],
        "equity_curve": sim["equity_curve"],
        "benchmark": benchmark,
        "strategies_available": [{"key": k, "name": v} for k, v in STRATEGY_NAMES.items()],
    }
