"use client";

import { useEffect, useState } from "react";
import type { TradeListResponse, TradeStatsResponse, MonthlyPnL } from "@/lib/api";
import { fetchTrades, fetchTradeStats, fetchMonthlyPnL } from "@/lib/api";

export default function TradesPage() {
  const [trades, setTrades] = useState<TradeListResponse | null>(null);
  const [stats, setStats] = useState<TradeStatsResponse | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchTrades(100, filterType || undefined, sortDir),
      fetchTradeStats(),
      fetchMonthlyPnL(),
    ])
      .then(([t, s, m]) => {
        setTrades(t);
        setStats(s);
        setMonthly(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load() }, [filterType, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <h2 className="text-lg font-bold text-[#111827]">交易记录</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">历史交易与统计</p>

      {/* Stats cards */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="总交易" value={stats.total_trades.toString()} />
          <StatCard label="胜率" value={`${stats.win_rate}%`} />
          <StatCard label="总盈亏" value={`¥${stats.total_pnl.toFixed(2)}`} color={stats.total_pnl >= 0 ? "text-green-600" : "text-red-500"} />
          <StatCard label="平均收益率" value={`${stats.avg_return}%`} color={stats.avg_return >= 0 ? "text-green-600" : "text-red-500"} />
          <StatCard label="最大回撤" value={`${stats.max_drawdown}%`} color="text-red-500" />
          <StatCard label="平均持仓" value={`${stats.avg_holding_days} 天`} />
          <StatCard label="盈利笔" value={String(stats.win_count)} color="text-green-600" />
          <StatCard label="亏损笔" value={String(stats.loss_count)} color="text-red-500" />
          <StatCard label="最高收益" value={`${stats.max_return}%`} color="text-green-600" />
          <StatCard label="最低收益" value={`${stats.min_return}%`} color="text-red-500" />
        </div>
      )}

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-[#111827]">月度收益</h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {monthly.map((m) => {
              const maxAbs = Math.max(...monthly.map((x) => Math.abs(x.total_pnl)), 1);
              const barH = Math.abs(m.total_pnl) / maxAbs * 100;
              const isPositive = m.total_pnl >= 0;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-[#6B7280]">
                    {m.total_pnl >= 0 ? "+" : ""}¥{m.total_pnl.toFixed(0)}
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(barH, 4)}%`,
                      background: isPositive ? "linear-gradient(to top, #22c55e, #16a34a)" : "linear-gradient(to top, #ef4444, #dc2626)",
                    }}
                  />
                  <span className="text-[10px] text-[#9CA3AF]">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#6B7280] outline-none focus:border-blue-400"
        >
          <option value="">全部类型</option>
          <option value="buy">买入</option>
          <option value="sell">卖出</option>
          <option value="add">加仓</option>
          <option value="reduce">减仓</option>
        </select>
        <button
          onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
          className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
        >
          {sortDir === "desc" ? "最新优先 ↓" : "最早优先 ↑"}
        </button>
        <span className="text-xs text-[#9CA3AF]">
          {trades ? `共 ${trades.count} 条` : ""}
        </span>
      </div>

      {/* Trades table */}
      <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-500" />
          </div>
        ) : !trades || trades.items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#6B7280]">暂无交易记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">日期</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">股票</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">价格</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">数量</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {trades.items.map((t) => (
                  <tr key={t.id} className="border-b border-[#F9FAFB] transition-colors hover:bg-[#FAFBFC]">
                    <td className="px-6 py-3.5 text-xs font-mono text-[#6B7280]">{t.trade_date}</td>
                    <td className="px-6 py-3.5">
                      <div className="text-sm font-semibold text-[#111827]">{t.name}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{t.code}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.trade_type === "buy" ? "bg-green-100 text-green-700" :
                        t.trade_type === "sell" ? "bg-red-100 text-red-700" :
                        t.trade_type === "add" ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {{buy:"买入",sell:"卖出",add:"加仓",reduce:"减仓"}[t.trade_type] || t.trade_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-mono text-[#111827]">¥{t.price.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-sm font-mono text-[#6B7280]">{t.quantity}</td>
                    <td className="px-6 py-3.5">
                      {t.trade_type === "sell" ? (
                        <span className={`text-sm font-semibold ${t.pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {t.pnl >= 0 ? "+" : ""}{t.pnl_pct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color || "text-[#111827]"}`}>{value}</p>
    </div>
  );
}
