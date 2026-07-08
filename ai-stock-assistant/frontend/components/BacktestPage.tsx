"use client";

import { useState } from "react";
import BacktestChart from "./BacktestChart";

const API_BASE = "http://localhost:8000/api/v1";

interface BacktestTrade {
  date: string;
  type: string;
  price: number;
  shares?: number;
  cost?: number;
  revenue?: number;
  pnl?: number;
  pnl_pct?: number;
  cash_after: number;
}

interface KlineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Signal {
  date: string;
  type: "buy" | "sell";
  price: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

interface BenchmarkData {
  initial_investment: number;
  shares_bought: number;
  avg_cost: number;
  final_value: number;
  total_return_pct: number;
}

interface StrategyOption {
  key: string;
  name: string;
}

interface BacktestResult {
  code: string;
  strategy: string;
  strategy_key: string;
  period_days: number;
  initial_cash: number;
  final_cash: number;
  total_pnl: number;
  total_pnl_pct: number;
  total_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate: number;
  max_drawdown_pct: number;
  trades: BacktestTrade[];
  kline: KlineBar[];
  signals: Signal[];
  equity_curve: EquityPoint[];
  benchmark: BenchmarkData;
  strategies_available: StrategyOption[];
}

const STOCK_PRESETS = [
  { code: "600519", name: "贵州茅台" },
  { code: "000858", name: "五粮液" },
  { code: "600036", name: "招商银行" },
  { code: "601318", name: "中国平安" },
  { code: "300750", name: "宁德时代" },
];

const PERIOD_OPTIONS = [
  { value: 90, label: "90 天" },
  { value: 180, label: "180 天" },
  { value: 365, label: "1 年" },
  { value: 730, label: "2 年" },
];

const DEFAULT_STRATEGIES: StrategyOption[] = [
  { key: "macd_cross", name: "MACD 金叉死叉" },
  { key: "multi_indicator", name: "多指标共振" },
  { key: "boll_breakout", name: "布林带突破" },
  { key: "ma_trend", name: "均线趋势跟踪" },
];

export default function BacktestPage() {
  const [code, setCode] = useState("000858");
  const [strategy, setStrategy] = useState("macd_cross");
  const [days, setDays] = useState(365);
  const [initialCash, setInitialCash] = useState("100000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState("");

  const strategies = result?.strategies_available ?? DEFAULT_STRATEGIES;

  const runBacktest = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `${API_BASE}/backtest/${code}?strategy=${strategy}&days=${days}&initial_cash=${initialCash}`,
        { signal: AbortSignal.timeout(60000) }
      );
      if (!res.ok) throw new Error(`请求失败 ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "回测失败");
    } finally {
      setLoading(false);
    }
  };

  const benchmarkDiff = result
    ? result.total_pnl_pct - result.benchmark.total_return_pct
    : 0;

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <h2 className="text-lg font-bold text-[#111827]">回测分析</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">选择策略和参数，回测历史表现</p>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">股票</label>
          <div className="flex gap-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-24 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
              placeholder="代码"
            />
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-2 py-2 text-xs outline-none focus:border-[#3B82F6]"
            >
              {STOCK_PRESETS.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">策略</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
          >
            {strategies.map((s) => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">回测天数</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">初始资金</label>
          <input
            type="number"
            min={10000}
            step={10000}
            value={initialCash}
            onChange={(e) => setInitialCash(e.target.value)}
            className="w-28 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={runBacktest}
          disabled={loading}
          className="rounded-lg bg-[#3B82F6] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "回测中..." : "开始回测"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">回测失败: {error}</p>}

      {result && (
        <>
          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">策略收益</div>
              <div className={`mt-1 text-lg font-bold ${result.total_pnl_pct >= 0 ? "text-red-500" : "text-green-600"}`}>
                {result.total_pnl_pct >= 0 ? "+" : ""}{result.total_pnl_pct}%
              </div>
              <div className="text-xs text-[#9CA3AF]">¥{result.total_pnl >= 0 ? "+" : ""}{result.total_pnl.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">买入持有</div>
              <div className={`mt-1 text-lg font-bold ${result.benchmark.total_return_pct >= 0 ? "text-red-500" : "text-green-600"}`}>
                {result.benchmark.total_return_pct >= 0 ? "+" : ""}{result.benchmark.total_return_pct}%
              </div>
              <div className="text-xs text-[#9CA3AF]">{result.benchmark.shares_bought} 股</div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">超额收益</div>
              <div className={`mt-1 text-lg font-bold ${benchmarkDiff >= 0 ? "text-red-500" : "text-green-600"}`}>
                {benchmarkDiff >= 0 ? "+" : ""}{benchmarkDiff.toFixed(2)}%
              </div>
              <div className="text-xs text-[#9CA3AF]">vs 买入持有</div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">胜率</div>
              <div className="mt-1 text-lg font-bold text-[#111827]">{result.win_rate}%</div>
              <div className="text-xs text-[#9CA3AF]">{result.win_trades}胜 {result.loss_trades}负</div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">最大回撤</div>
              <div className="mt-1 text-lg font-bold text-red-500">{result.max_drawdown_pct}%</div>
            </div>
          </div>

          {/* Chart */}
          {result.kline.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <BacktestChart
                kline={result.kline}
                signals={result.signals}
                equityCurve={result.equity_curve}
                benchmark={result.benchmark}
                initialCash={result.initial_cash}
              />
            </div>
          )}

          {/* Trade log */}
          <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="border-b border-[#E5E7EB] px-5 py-3">
              <h3 className="text-sm font-bold text-[#111827]">交易记录（最近 {result.trades.length} 笔）</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="px-5 py-2.5 text-left font-semibold text-[#6B7280]">日期</th>
                    <th className="px-5 py-2.5 text-left font-semibold text-[#6B7280]">类型</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-[#6B7280]">价格</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-[#6B7280]">股数</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-[#6B7280]">盈亏</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-[#6B7280]">收益率</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-[#6B7280]">余额</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-b border-[#F9FAFB] last:border-b-0">
                      <td className="px-5 py-2.5 text-[#374151]">{t.date}</td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${
                          t.type === "买入" ? "bg-blue-50 text-blue-600" :
                          t.type === "卖出" || t.type === "平仓" ? "bg-green-50 text-green-600" : ""
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">¥{t.price.toFixed(3)}</td>
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">{t.shares ?? "-"}</td>
                      <td className={`px-5 py-2.5 text-right font-medium ${(t.pnl ?? 0) >= 0 ? "text-red-500" : "text-green-600"}`}>
                        {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}¥${t.pnl.toFixed(2)}` : "-"}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-medium ${(t.pnl_pct ?? 0) >= 0 ? "text-red-500" : "text-green-600"}`}>
                        {t.pnl_pct != null ? `${t.pnl_pct >= 0 ? "+" : ""}${t.pnl_pct.toFixed(2)}%` : "-"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">¥{t.cash_after.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer summary */}
          <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#6B7280]">
              策略: {result.strategy} · 回测区间: {result.period_days} 天 · 本金: ¥{result.initial_cash.toLocaleString()} · 终值: ¥{result.final_cash.toLocaleString()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
