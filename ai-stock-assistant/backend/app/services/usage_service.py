from __future__ import annotations

from typing import Optional

from app.config import LLM_INPUT_PRICE_PER_1M, LLM_OUTPUT_PRICE_PER_1M, OPENAI_MODEL
from app.schemas.usage import TokenUsage


def calculate_cost_rmb(
    prompt_tokens: int,
    completion_tokens: int,
    model: Optional[str] = None,
) -> float:
    """按每百万 token 单价（人民币）估算调用成本。"""
    input_cost = prompt_tokens / 1_000_000 * LLM_INPUT_PRICE_PER_1M
    output_cost = completion_tokens / 1_000_000 * LLM_OUTPUT_PRICE_PER_1M
    return round(input_cost + output_cost, 6)


def build_token_usage(
    prompt_tokens: int,
    completion_tokens: int,
    model: Optional[str] = None,
) -> TokenUsage:
    model_name = model or OPENAI_MODEL
    total_tokens = prompt_tokens + completion_tokens
    return TokenUsage(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_rmb=calculate_cost_rmb(prompt_tokens, completion_tokens, model_name),
        model=model_name,
    )


def format_usage_report(usage: TokenUsage) -> str:
    return (
        f"模型: {usage.model}\n"
        f"输入 Token: {usage.prompt_tokens}\n"
        f"输出 Token: {usage.completion_tokens}\n"
        f"合计 Token: {usage.total_tokens}\n"
        f"估算费用: {usage.cost_rmb:.4f} 元（人民币）"
    )
