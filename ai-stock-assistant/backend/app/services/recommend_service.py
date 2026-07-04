from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import app.config as cfg
from app.agents import (
    AgentResult,
    run_decision_agent,
    run_news_agent,
    run_risk_agent,
    run_technical_agent,
)
from app.agents.orchestrator import run_agent_pipeline
from app.schemas.stock import AgentDetail, RecommendationItem, RecommendationReport, RuleCandidate
from app.schemas.usage import TokenUsage
from app.services.filter_service import get_price_mode_label
from app.services.indicator_service import build_indicator_explanation
from app.services.news_service import build_news_summary, clear_news_cache, get_stock_news_bundle
from app.services.rule_engine import screen_candidates
from app.services.usage_service import build_token_usage, format_usage_report


def _empty_usage() -> TokenUsage:
    return build_token_usage(prompt_tokens=0, completion_tokens=0, model=cfg.OPENAI_MODEL)


def _process_candidate(
    candidate: RuleCandidate,
) -> tuple[RuleCandidate, int, str, str, int, TokenUsage, list[AgentDetail]]:
    news_bundle = get_stock_news_bundle(candidate.code, candidate.name)
    news_summary = build_news_summary(news_bundle)

    pipeline = run_agent_pipeline(candidate.code, candidate.name, candidate.indicators, news_summary)

    agent_details = [
        AgentDetail(
            name="news",
            label="NewsAgent",
            stars=pipeline.news_result.stars,
            signal=pipeline.news_result.signal,
            summary=pipeline.news_result.summary,
            details=pipeline.news_result.details,
        ),
        AgentDetail(
            name="technical",
            label="TechnicalAgent",
            stars=pipeline.technical_result.stars,
            signal=pipeline.technical_result.signal,
            summary=pipeline.technical_result.summary,
            details=pipeline.technical_result.details,
        ),
        AgentDetail(
            name="risk",
            label="RiskAgent",
            stars=pipeline.risk_result.stars,
            signal=pipeline.risk_result.signal,
            summary=pipeline.risk_result.summary,
            details=pipeline.risk_result.details,
        ),
    ]

    return candidate, pipeline.score, pipeline.action, pipeline.reason, news_bundle.count, pipeline.combined_usage, agent_details


def build_recommendations(
    candidate_limit: int = 10,
    top_n: int = 5,
    min_rule_score: int = 60,
) -> RecommendationReport:
    """批量推荐：规则预筛选后，多 Agent 并行分析候选股。"""
    if top_n <= 0:
        raise ValueError("top_n must be greater than 0")

    clear_news_cache()
    candidates = screen_candidates(max_candidates=candidate_limit, min_rule_score=min_rule_score)
    if not candidates:
        return RecommendationReport(
            date=date.today().isoformat(),
            filter_mode={
                "low_price_mode": cfg.LOW_PRICE_MODE,
                "max_stock_price": cfg.MAX_STOCK_PRICE,
            },
            candidate_count=0,
            analyzed_count=0,
            count=0,
            usage_summary=_empty_usage(),
            recommendations=[],
        )

    analyzed: list[tuple[RuleCandidate, int, str, str, int, TokenUsage, list[AgentDetail]]] = []
    usage_summary = _empty_usage()
    pool_size = min(len(candidates), 5)

    with ThreadPoolExecutor(max_workers=pool_size) as pool:
        futures = [pool.submit(_process_candidate, c) for c in candidates]
        for future in as_completed(futures):
            candidate, score, action, reason, news_count, token_usage, agent_details = future.result()
            analyzed.append((candidate, score, action, reason, news_count, token_usage, agent_details))
            if token_usage:
                usage_summary = usage_summary.merge(token_usage)

    analyzed.sort(key=lambda pair: (pair[1], pair[0].rule_score), reverse=True)

    recommendations = []
    for index, (candidate, score, action, reason, news_count, token_usage, agent_details) in enumerate(analyzed[:top_n]):
        stars = max(1, min(5, round(score / 2)))
        price = candidate.close_price or 0
        # 根据评分计算目标价和止损价
        score_ratio = score / 10
        target_mult = 1.08 + score_ratio * 0.02  # 评分高则目标价更高: 1.10~1.28
        stop_mult = 0.95 - score_ratio * 0.02    # 评分高则止损更紧: 0.93~0.75
        recommendations.append(RecommendationItem(
            rank=index + 1,
            code=candidate.code,
            name=candidate.name,
            close_price=price,
            passes_price_filter=None,
            score=score * 10,
            stars=stars,
            action=action,
            reason=reason,
            token_usage=token_usage,
            rule_score=candidate.rule_score,
            passed_rules=candidate.passed_rules,
            news_count=news_count,
            agent_details=agent_details,
            target_price=round(price * target_mult, 2),
            stop_loss_price=round(price * stop_mult, 2),
        ))

    return RecommendationReport(
        date=date.today().isoformat(),
        filter_mode={
            "low_price_mode": cfg.LOW_PRICE_MODE,
            "max_stock_price": cfg.MAX_STOCK_PRICE,
        },
        candidate_count=len(candidates),
        analyzed_count=len(analyzed),
        count=len(recommendations),
        usage_summary=usage_summary,
        recommendations=recommendations,
    )


def save_report(report: RecommendationReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"recommendations_{report.date}.json"
    output_path.write_text(
        json.dumps(report.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Day 2 batch stock recommendations.")
    parser.add_argument("--candidate-limit", type=int, default=10, help="规则筛选后最多分析几只")
    parser.add_argument("--top-n", type=int, default=5, help="最终推荐数量")
    parser.add_argument("--min-rule-score", type=int, default=60, help="规则评分下限")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="output",
        help="JSON 报告输出目录",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Day 2/3: 预筛选 + 新闻 + AI 推荐")
    print("=" * 60)
    print(get_price_mode_label())
    print(
        f"参数: candidate_limit={args.candidate_limit}, "
        f"top_n={args.top_n}, min_rule_score={args.min_rule_score}"
    )

    report = build_recommendations(
        candidate_limit=args.candidate_limit,
        top_n=args.top_n,
        min_rule_score=args.min_rule_score,
    )

    output_path = save_report(report, Path(args.output_dir))

    print("\n" + "=" * 60)
    print("筛选与统计")
    print("=" * 60)
    print(f"规则候选: {report.candidate_count} 只")
    print(f"AI 已分析: {report.analyzed_count} 只")
    print(f"最终推荐: {report.count} 只")
    print(format_usage_report(report.usage_summary))

    print("\n" + "=" * 60)
    print("Top 推荐")
    print("=" * 60)
    if not report.recommendations:
        print("暂无符合条件的推荐，可尝试降低 --min-rule-score 或扩大 --candidate-limit")
    for item in report.recommendations:
        print(
            f"#{item.rank} {item.name}({item.code}) "
            f"价={item.close_price:.2f} 规则={item.rule_score} AI={item.score} "
            f"新闻={item.news_count}条 星级={item.stars}/5 建议={item.action}"
        )
        print(f"   理由: {item.reason}")

    print("\n" + "=" * 60)
    print("JSON 报告")
    print("=" * 60)
    print(output_path.resolve())


if __name__ == "__main__":
    main()
