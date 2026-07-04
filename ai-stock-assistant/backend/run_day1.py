"""Day 1 验收脚本：K 线 → 指标 → AI 分析 → Token 成本"""

import app.config  # noqa: F401  加载配置并清除代理

from app.config import LOW_PRICE_MODE, MAX_STOCK_PRICE
from app.schemas.stock import KlineBar
from app.services.ai_service import analyze_stock
from app.services.filter_service import get_price_mode_label, pick_demo_stock_code
from app.services.indicator_service import build_indicator_snapshot
from app.services.stock_service import get_kline
from app.services.usage_service import format_usage_report


def main() -> None:
    days = 60

    print("=" * 60)
    print("筛选模式")
    print("=" * 60)
    print(get_price_mode_label())
    if LOW_PRICE_MODE:
        print(f"说明: 仅推荐单价 ≤ {MAX_STOCK_PRICE:.2f} 元的股票（可在 .env 调整）")
    else:
        print("说明: 当前不限制股价，适合后期扩大投资范围")

    code, name, spot_price = pick_demo_stock_code()
    print(f"本次演示股票: {name}({code})，现价约 {spot_price:.2f} 元")

    print("\n" + "=" * 60)
    print("Step 1: 获取 K 线")
    print("=" * 60)
    kline = get_kline(code, days=days)
    bars = [KlineBar(**row) for row in kline.to_dict(orient="records")]
    print(f"{name}({code}) 共 {len(bars)} 条")
    latest = bars[-1]
    print(
        f"最新: {latest.date} 开={latest.open:.2f} 高={latest.high:.2f} "
        f"低={latest.low:.2f} 收={latest.close:.2f} 量={latest.volume:.0f}"
    )

    print("\n" + "=" * 60)
    print("Step 2: 计算技术指标")
    print("=" * 60)
    indicators = build_indicator_snapshot(kline, code=code, name=name)
    print(f"日期: {indicators.trade_date}")
    print(f"MACD: {indicators.macd_signal} | RSI: {indicators.rsi:.2f} ({indicators.rsi_signal})")
    print(
        f"MA5={indicators.ma5:.2f}, MA20={indicators.ma20:.2f}, MA60={indicators.ma60:.2f}"
    )

    print("\n" + "=" * 60)
    print("Step 3: AI 分析")
    print("=" * 60)
    result = analyze_stock(indicators)
    print(f"评分: {result.score}")
    print(f"星级: {result.stars}/5")
    print(f"建议: {result.action}")
    print(f"理由: {result.reason}")
    if result.passes_price_filter is not None:
        status = "符合" if result.passes_price_filter else "不符合"
        print(f"单价筛选: {status}当前模式条件（收盘价 {result.close_price:.2f} 元）")

    print("\n" + "=" * 60)
    print("Step 4: Token 消耗与费用")
    print("=" * 60)
    if result.token_usage:
        print(format_usage_report(result.token_usage))
    else:
        print("未获取到 token 用量信息")


if __name__ == "__main__":
    main()
