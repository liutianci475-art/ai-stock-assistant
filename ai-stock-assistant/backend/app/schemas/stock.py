from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.usage import TokenUsage


class AgentDetail(BaseModel):
    name: str  # "news" | "technical" | "risk"
    label: str  # "NewsAgent" | "TechnicalAgent" | "RiskAgent"
    stars: int = 3
    signal: str = "中性"
    summary: str = ""
    details: str = ""


class KlineBar(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class StockSnapshot(BaseModel):
    code: str
    name: str
    days: int
    klines: List[KlineBar]


class IndicatorSnapshot(BaseModel):
    code: str
    name: str
    trade_date: str
    close: float
    volume: float
    ma5: Optional[float] = None
    ma20: Optional[float] = None
    ma60: Optional[float] = None
    macd_dif: Optional[float] = None
    macd_dea: Optional[float] = None
    macd_hist: Optional[float] = None
    macd_signal: str = ""
    rsi: Optional[float] = None
    rsi_signal: str = ""
    boll_upper: Optional[float] = None
    boll_mid: Optional[float] = None
    boll_lower: Optional[float] = None
    kline_summary: str = ""
    indicator_explanation: str = ""


class AnalysisResult(BaseModel):
    code: str
    name: str
    score: int = Field(ge=0, le=100)
    stars: int = Field(ge=1, le=5)
    action: str
    reason: str
    raw_response: str = ""
    token_usage: Optional[TokenUsage] = None
    close_price: Optional[float] = None
    passes_price_filter: Optional[bool] = None


class RuleCandidate(BaseModel):
    code: str
    name: str
    trade_date: str
    close_price: float
    rule_score: int = Field(ge=0, le=100)
    passed_rules: List[str] = []
    failed_rules: List[str] = []
    indicators: IndicatorSnapshot


class RecommendationItem(BaseModel):
    rank: int
    code: str
    name: str
    close_price: Optional[float] = None
    passes_price_filter: Optional[bool] = None
    score: int = Field(ge=0, le=100)
    stars: int = Field(ge=1, le=5)
    action: str
    reason: str
    token_usage: Optional[TokenUsage] = None
    rule_score: Optional[int] = Field(default=None, ge=0, le=100)
    passed_rules: List[str] = []
    news_count: int = 0
    agent_details: List[AgentDetail] = []
    target_price: Optional[float] = None
    stop_loss_price: Optional[float] = None


class RecommendationReport(BaseModel):
    date: str
    filter_mode: dict
    candidate_count: int
    analyzed_count: int
    count: int
    usage_summary: TokenUsage
    recommendations: List[RecommendationItem]
