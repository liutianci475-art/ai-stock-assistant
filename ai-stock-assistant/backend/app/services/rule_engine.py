from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Iterable, Optional

import pandas as pd

import app.config as cfg
from app.schemas.stock import RuleCandidate
from app.services.filter_service import filter_by_max_price, get_a_share_spot, passes_price_filter
from app.services.indicator_service import build_indicator_snapshot, calculate_indicators
from app.services.stock_service import get_kline


@dataclass(frozen=True)
class RuleCheck:
    name: str
    passed: bool
    weight: int


def _latest_number(row: pd.Series, field: str) -> Optional[float]:
    value = row.get(field)
    if pd.isna(value):
        return None
    return float(value)


def _is_risky_name(name: str) -> bool:
    upper = name.upper()
    return "ST" in upper or "退" in name or "*" in name


def _evaluate_rules(enriched: pd.DataFrame, name: str) -> list[RuleCheck]:
    latest = enriched.iloc[-1]
    previous = enriched.iloc[-2] if len(enriched) >= 2 else latest

    close = _latest_number(latest, "close")
    ma20 = _latest_number(latest, "ma20")
    ma60 = _latest_number(latest, "ma60")
    rsi = _latest_number(latest, "rsi")
    macd_hist = _latest_number(latest, "macd_hist")
    prev_macd_hist = _latest_number(previous, "macd_hist")
    volume = _latest_number(latest, "volume")
    volume_ma20 = float(enriched["volume"].tail(20).mean()) if len(enriched) >= 20 else None

    macd_turning_positive = (
        macd_hist is not None
        and prev_macd_hist is not None
        and (macd_hist > 0 or macd_hist > prev_macd_hist)
    )

    checks = [
        RuleCheck("exclude risky stock", not _is_risky_name(name), 20),
        RuleCheck(
            "price within configured mode",
            close is not None and passes_price_filter(close),
            15 if cfg.LOW_PRICE_MODE else 5,
        ),
        RuleCheck("close above MA20", close is not None and ma20 is not None and close > ma20, 20),
        RuleCheck("MA20 above or near MA60", ma20 is not None and ma60 is not None and ma20 >= ma60 * 0.98, 10),
        RuleCheck("RSI in healthy range", rsi is not None and 30 < rsi < 70, 15),
        RuleCheck("MACD improving", macd_turning_positive, 15),
        RuleCheck(
            "volume above 20-day average",
            volume is not None and volume_ma20 is not None and volume >= volume_ma20 * 1.05,
            5,
        ),
    ]
    return checks


def _rule_score(checks: Iterable[RuleCheck]) -> int:
    check_list = list(checks)
    possible = sum(check.weight for check in check_list)
    gained = sum(check.weight for check in check_list if check.passed)
    if possible <= 0:
        return 0
    return round(gained / possible * 100)


def evaluate_stock(code: str, name: str, days: int = 80) -> RuleCandidate | None:
    try:
        kline = get_kline(code, days=days)
        enriched = calculate_indicators(kline)
        checks = _evaluate_rules(enriched, name)
        indicators = build_indicator_snapshot(kline, code=code, name=name)
        passed = [check.name for check in checks if check.passed]
        failed = [check.name for check in checks if not check.passed]
        return RuleCandidate(
            code=code,
            name=name,
            trade_date=indicators.trade_date,
            close_price=indicators.close,
            rule_score=_rule_score(checks),
            passed_rules=passed,
            failed_rules=failed,
            indicators=indicators,
        )
    except Exception:
        return None


def screen_candidates(
    max_candidates: int = 30,
    min_rule_score: int = 60,
    days: int = 80,
) -> list[RuleCandidate]:
    if max_candidates <= 0:
        raise ValueError("max_candidates must be greater than 0")

    spot = get_a_share_spot()
    if cfg.LOW_PRICE_MODE:
        spot = filter_by_max_price(spot, cfg.MAX_STOCK_PRICE)
    spot = spot.sort_values(["price", "code"], ascending=[True, True]).reset_index(drop=True)

    scan_limit = max(max_candidates * 4, max_candidates)

    candidates: list[RuleCandidate] = []
    pool_size = min(scan_limit, 8)

    with ThreadPoolExecutor(max_workers=pool_size) as pool:
        futures = [
            pool.submit(evaluate_stock, str(row.code).zfill(6), str(row.name), days)
            for row in spot.head(scan_limit).itertuples(index=False)
        ]
        for future in as_completed(futures):
            candidate = future.result()
            if candidate is not None and candidate.rule_score >= min_rule_score:
                candidates.append(candidate)
                if len(candidates) >= max_candidates:
                    break

    return sorted(candidates, key=lambda item: item.rule_score, reverse=True)


if __name__ == "__main__":
    import json

    result = screen_candidates(max_candidates=10)
    print(json.dumps([item.model_dump(exclude={"indicators"}) for item in result], ensure_ascii=False, indent=2))
