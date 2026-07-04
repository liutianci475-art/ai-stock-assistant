const API_BASE = "http://localhost:8000/api/v1";

export interface KlineBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface KlineResponse {
  code: string;
  days: number;
  klines: KlineBar[];
}

export interface AgentDetail {
  name: string;
  label: string;
  stars: number;
  signal: string;
  summary: string;
  details: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_rmb: number;
  model: string;
}

export interface RecommendationItem {
  rank: number;
  code: string;
  name: string;
  close_price: number;
  passes_price_filter: boolean;
  score: number;
  stars: number;
  action: string;
  reason: string;
  token_usage: TokenUsage | null;
  rule_score: number;
  passed_rules: string[];
  news_count: number;
  agent_details: AgentDetail[];
  target_price: number | null;
  stop_loss_price: number | null;
}

export interface RecommendationReport {
  date: string;
  filter_mode: { low_price_mode: boolean; max_stock_price: number };
  candidate_count: number;
  analyzed_count: number;
  count: number;
  usage_summary: TokenUsage;
  recommendations: RecommendationItem[];
}

export interface FilterSettings {
  low_price_mode: boolean;
  max_stock_price: number;
  min_stock_price: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(300000) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export function fetchRecommendations(
  candidateLimit = 10,
  topN = 5
): Promise<RecommendationReport> {
  return fetchJson<RecommendationReport>(
    `${API_BASE}/recommendations/today?candidate_limit=${candidateLimit}&top_n=${topN}`
  );
}

export function refreshRecommendations(
  candidateLimit = 10,
  topN = 5
): Promise<RecommendationReport> {
  return fetchJson<RecommendationReport>(
    `${API_BASE}/recommendations/today?candidate_limit=${candidateLimit}&top_n=${topN}`,
    { method: "POST" }
  );
}

export function fetchFilterSettings(): Promise<FilterSettings> {
  return fetchJson<FilterSettings>(`${API_BASE}/settings/filter`);
}

export function updateFilterSettings(
  body: Partial<FilterSettings>
): Promise<FilterSettings> {
  return fetchJson<FilterSettings>(`${API_BASE}/settings/filter`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── 持仓管理 ───

export interface HoldingItem {
  id: number;
  code: string;
  name: string;
  buy_date: string;
  buy_price: number;
  quantity: number;
  current_price: number;
  stop_loss: number;
  take_profit: number;
  ai_score_at_buy: number;
  buy_reason: string;
  status: string;
  pnl_pct: number | null;
  pnl_amount: number | null;
  market_value: number | null;
  days_held: number | null;
  created_at: string;
  updated_at: string;
}

export interface HoldingListResponse {
  count: number;
  total_market_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  items: HoldingItem[];
}

export interface HoldingCreateRequest {
  code: string;
  name: string;
  buy_price: number;
  quantity: number;
  stop_loss?: number;
  take_profit?: number;
  buy_reason?: string;
}

export interface HoldingUpdateRequest {
  stop_loss?: number;
  take_profit?: number;
}

export interface TradeRecord {
  id: number;
  holding_id: number | null;
  code: string;
  name: string;
  trade_date: string;
  trade_type: string;
  price: number;
  quantity: number;
  reason: string;
  pnl: number;
  pnl_pct: number;
  created_at: string;
}

export interface TradeListResponse {
  count: number;
  items: TradeRecord[];
}

export interface TradeStatsResponse {
  total_trades: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  total_pnl: number;
  avg_return: number;
  max_return: number;
  min_return: number;
  max_drawdown: number;
  avg_holding_days: number;
}

export interface MonthlyPnL {
  month: string;
  trade_count: number;
  total_pnl: number;
  win_count: number;
}

export interface DailyReviewResult {
  holding_id: number;
  code: string;
  name: string;
  action: string;
  score: number;
  stars: number;
  reason: string;
  current_price: number;
  pnl_pct: number;
}

export interface DailyRoutineResponse {
  date: string;
  holdings_reviewed: number;
  new_candidates: number;
  new_recommendations: number;
  total_token_usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_rmb: number };
  reviews: DailyReviewResult[];
}

export interface HoldingAdvice {
  holding_id: number;
  code: string;
  name: string;
  action: string;
  severity: string;
  reason: string;
  suggested_hold_days: number;
  days_held: number;
  pnl_pct: number;
  llm_analyzed: boolean;
}

export interface HoldingsAdviceResponse {
  items: HoldingAdvice[];
}

export function fetchHoldingsAdvice(): Promise<HoldingsAdviceResponse> {
  return fetchJson<HoldingsAdviceResponse>(`${API_BASE}/portfolio/holdings-advice`);
}

export function fetchHoldings(status = "holding"): Promise<HoldingListResponse> {
  return fetchJson<HoldingListResponse>(`${API_BASE}/portfolio?status=${status}`);
}

export function createHolding(data: HoldingCreateRequest): Promise<HoldingItem> {
  return fetchJson<HoldingItem>(`${API_BASE}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function sellHolding(holdingId: number, sellPrice = 0, reason = ""): Promise<HoldingItem> {
  return fetchJson<HoldingItem>(`${API_BASE}/portfolio/${holdingId}/sell?sell_price=${sellPrice}&reason=${encodeURIComponent(reason)}`, {
    method: "POST",
  });
}

export function updateHolding(holdingId: number, data: HoldingUpdateRequest): Promise<HoldingItem> {
  return fetchJson<HoldingItem>(`${API_BASE}/portfolio/${holdingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteHolding(holdingId: number): Promise<void> {
  return fetchJson<void>(`${API_BASE}/portfolio/${holdingId}`, { method: "DELETE" });
}

export function fetchTrades(
  limit = 50,
  tradeType?: string,
  sort = "desc",
  code?: string
): Promise<TradeListResponse> {
  const params = new URLSearchParams({ limit: String(limit), sort });
  if (tradeType) params.set("trade_type", tradeType);
  if (code) params.set("code", code);
  return fetchJson<TradeListResponse>(`${API_BASE}/trades?${params}`);
}

export function fetchTradeStats(): Promise<TradeStatsResponse> {
  return fetchJson<TradeStatsResponse>(`${API_BASE}/trades/stats`);
}

export function fetchMonthlyPnL(): Promise<MonthlyPnL[]> {
  return fetchJson<MonthlyPnL[]>(`${API_BASE}/trades/monthly`);
}

export interface SingleAnalysisResponse {
  code: string;
  name: string;
  score: number;
  stars: number;
  action: string;
  reason: string;
  close_price: number;
  passes_price_filter: boolean | null;
  token_usage: TokenUsage | null;
  agent_details: AgentDetail[];
}

export function fetchSingleAnalysis(code: string, name = "", days = 60): Promise<SingleAnalysisResponse> {
  return fetchJson<SingleAnalysisResponse>(`${API_BASE}/analysis/single`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, name, days, with_news: true }),
  });
}

export interface StockSearchResult {
  code: string;
  name: string;
}

export function searchStocks(q: string): Promise<StockSearchResult[]> {
  return fetchJson<StockSearchResult[]>(
    `${API_BASE}/stocks/search?q=${encodeURIComponent(q)}`
  );
}

export function fetchKline(code: string, days = 60): Promise<KlineResponse> {
  return fetchJson<KlineResponse>(`${API_BASE}/stocks/${code}/kline?days=${days}`);
}

export interface IndicatorRecord {
  date: string;
  macd_dif: number | null;
  macd_dea: number | null;
  macd_hist: number | null;
  rsi: number | null;
  boll_upper: number | null;
  boll_mid: number | null;
  boll_lower: number | null;
}

export interface IndicatorsHistoryResponse {
  code: string;
  days: number;
  records: IndicatorRecord[];
}

export function fetchIndicatorsHistory(code: string, days = 120): Promise<IndicatorsHistoryResponse> {
  return fetchJson<IndicatorsHistoryResponse>(`${API_BASE}/stocks/${code}/indicators-history?days=${days}`);
}

export function fetchIndicators(code: string, days = 60, name = ""): Promise<any> {
  return fetchJson<any>(`${API_BASE}/stocks/${code}/indicators?days=${days}&name=${encodeURIComponent(name)}`);
}

export function runDailyRoutine(): Promise<DailyRoutineResponse> {
  return fetchJson<DailyRoutineResponse>(`${API_BASE}/daily-routine`, { method: "POST" });
}
