"use client";

import { useState } from "react";

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

interface BacktestResult {
  code: string;
  strategy: string;
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
}

const STOCK_PRESETS = [
  { code: "600519", name: "贵州茅台" },
  { code: "000858", name: "五粮液" },
  { code: "600036", name: "招商银行" },
  { code: "601318", name: "中国平安" },
  { code: "300750", name: "宁德时代" },
];

export default function BacktestPage() {
  const [code, setCode] = useState("600519");
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState("");

  const runBacktest = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/backtest/${code}?days=${days}&initial_cash=100000`, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`请求失败 ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "回测失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <h2 className="text-lg font-bold text-[#111827]">回测分析</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">MACD 金叉死叉策略历史表现回测</p>

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
          <label className="block text-xs font-medium text-[#6B7280] mb-1">回测天数</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
          >
            <option value={90}>90 天</option>
            <option value={180}>180 天</option>
            <option value={365}>1 年</option>
            <option value={730}>2 年</option>
          </select>
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

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">总收益率</div>
              <div className={`mt-1 text-lg font-bold ${result.total_pnl_pct >= 0 ? "text-green-600" : "text-red-500"}`}>
                {result.total_pnl_pct >= 0 ? "+" : ""}{result.total_pnl_pct}%
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-[#6B7280]">总盈亏</div>
              <div className={`mt-1 text-lg font-bold ${result.total_pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                ¥{result.total_pnl >= 0 ? "+" : ""}{result.total_pnl.toLocaleString()}
              </div>
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
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">¥{t.price.toFixed(2)}</td>
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">{t.shares ?? "-"}</td>
                      <td className={`px-5 py-2.5 text-right font-medium ${(t.pnl ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}¥${t.pnl.toFixed(2)}` : "-"}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-medium ${(t.pnl_pct ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {t.pnl_pct != null ? `${t.pnl_pct >= 0 ? "+" : ""}${t.pnl_pct.toFixed(2)}%` : "-"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[#6B7280]">¥{t.cash_after.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buy & hold benchmark */}
          <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#6B7280]">
              策略: {result.strategy} | 回测区间: {result.period_days} 天 | 本金: ¥{result.initial_cash.toLocaleString()} | 终值: ¥{result.final_cash.toLocaleString()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
