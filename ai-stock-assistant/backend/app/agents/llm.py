"""给 Agent 使用的 LLM 调用工具"""
from __future__ import annotations

import json
import re
from typing import Optional

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.schemas.usage import TokenUsage
from app.services.usage_service import build_token_usage


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        result = json.loads(text)
        # 如果 AI 返回的是 list（如 [...objects]），取第一个元素
        if isinstance(result, list):
            result = result[0] if result else {}
        if not isinstance(result, dict):
            raise ValueError(f"JSON 不是对象类型: {type(result).__name__}")
        return result
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError(f"AI 返回内容不是合法 JSON: {text[:200]}")
        return json.loads(match.group())


def _extract_usage(response) -> TokenUsage:
    usage = getattr(response, "usage", None)
    pt = getattr(usage, "prompt_tokens", 0) or 0
    ct = getattr(usage, "completion_tokens", 0) or 0
    return build_token_usage(prompt_tokens=pt, completion_tokens=ct, model=OPENAI_MODEL)


def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> tuple[dict, TokenUsage]:
    """调用 LLM 并返回 (解析后的 JSON, Token用量)。"""
    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=60)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=1024,
    )
    raw = response.choices[0].message.content or ""
    parsed = _extract_json(raw)
    usage = _extract_usage(response)
    return parsed, usage
