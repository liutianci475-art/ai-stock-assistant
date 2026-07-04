"""持仓回顾 Prompt"""
from __future__ import annotations

from typing import Optional

PORTFOLIO_REVIEW_PROMPT = """你是一名专业的 A 股分析师。用户已经持有以下股票，请决定是否继续持有。

## 持仓信息
- 股票：{name}（{code}）
- 买入价：{buy_price}
- 当前价：{current_price}
- 盈亏：{pnl_pct}%
- 持有天数：{holding_days}
- 止损价：{stop_loss}
- 止盈价：{take_profit}

## 技术指标
- MACD：DIF={dif}, DEA={dea}, 柱状图={hist}（{macd_signal}）
- RSI(14)：{rsi}（{rsi_signal}）
- MA：MA5={ma5}, MA20={ma20}, MA60={ma60}
- 股价与 MA20 关系：{close_vs_ma20}
- 成交量：今日={volume}, 20 日均量={volume_ma20}

## 近期新闻
{news_summary}

## 决策要求
请综合以上信息，选择以下操作之一：
1. **持有** — 趋势正常，继续持有
2. **加仓** — 趋势向好，可在回调时加仓（给出建议加仓价区间）
3. **减仓** — 风险上升或达到部分止盈，建议减仓（给出建议减仓比例）
4. **卖出** — 趋势反转、达到止盈/止损或风险过高

以 JSON 格式返回：
{{
  "action": "持有/加仓/减仓/卖出",
  "score": 0~100,
  "stars": 1~5,
  "reason": "3~5 句话说明理由",
  "suggested_add_price": "建议加仓价区间（如 55~57）",
  "suggested_reduce_ratio": "建议减仓比例（如 50%）"
}}
"""


def build_portfolio_review_prompt(
    code: str,
    name: str,
    buy_price: float,
    current_price: float,
    pnl_pct: float,
    holding_days: int,
    stop_loss: float,
    take_profit: float,
    dif: str,
    dea: str,
    hist: str,
    macd_signal: str,
    rsi: str,
    rsi_signal: str,
    ma5: str,
    ma20: str,
    ma60: str,
    close_vs_ma20: str,
    volume: str,
    volume_ma20: str = "N/A",
    news_summary: Optional[str] = None,
) -> str:
    news = news_summary or "暂无近期新闻"
    return PORTFOLIO_REVIEW_PROMPT.format(
        code=code,
        name=name,
        buy_price=f"{buy_price:.2f}",
        current_price=f"{current_price:.2f}",
        pnl_pct=f"{pnl_pct:.2f}",
        holding_days=holding_days,
        stop_loss=f"{stop_loss:.2f}" if stop_loss else "未设置",
        take_profit=f"{take_profit:.2f}" if take_profit else "未设置",
        dif=dif,
        dea=dea,
        hist=hist,
        macd_signal=macd_signal,
        rsi=rsi,
        rsi_signal=rsi_signal,
        ma5=ma5,
        ma20=ma20,
        ma60=ma60,
        close_vs_ma20=close_vs_ma20,
        volume=volume,
        volume_ma20=volume_ma20,
        news_summary=news,
    )
