"""Day 3 验收脚本：新闻抓取 → 摘要 → （可选）AI 分析"""

import argparse

import app.config  # noqa: F401

from app.services.ai_service import analyze_stock
from app.services.indicator_service import get_indicator_snapshot
from app.services.news_service import build_news_summary, get_stock_news_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Day 3 news-enhanced analysis.")
    parser.add_argument("--code", type=str, default="600519")
    parser.add_argument("--name", type=str, default="贵州茅台")
    parser.add_argument("--with-ai", action="store_true", help="是否调用 AI（会消耗 token）")
    args = parser.parse_args()

    print("=" * 60)
    print("Step 1: 抓取新闻/公告/舆情")
    print("=" * 60)
    bundle = get_stock_news_bundle(args.code, args.name)
    print(f"{bundle.name}({bundle.code}) 共抓取 {bundle.count} 条")
    for item in bundle.items:
        print(f"- [{item.source}] {item.title} ({item.publish_time})")

    print("\n" + "=" * 60)
    print("Step 2: 生成新闻摘要（供 Prompt 使用）")
    print("=" * 60)
    summary = build_news_summary(bundle)
    print(summary)

    if not args.with_ai:
        print("\n未调用 AI。若要测试含新闻的 AI 分析，请加 --with-ai")
        return

    print("\n" + "=" * 60)
    print("Step 3: 含新闻的 AI 分析")
    print("=" * 60)
    indicators = get_indicator_snapshot(args.code, days=60, name=args.name)
    result = analyze_stock(indicators, news_summary=summary, use_batch_prompt=True)
    print(f"评分: {result.score} | 星级: {result.stars}/5 | 建议: {result.action}")
    print(f"理由: {result.reason}")
    if result.token_usage:
        print(f"Token: {result.token_usage.total_tokens} | 费用: {result.token_usage.cost_rmb:.4f} 元")


if __name__ == "__main__":
    main()
