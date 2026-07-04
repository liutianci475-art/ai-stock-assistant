"use client";

import { useEffect, useState, useCallback } from "react";
import type { HoldingAdvice } from "@/lib/api";
import { fetchHoldingsAdvice } from "@/lib/api";

const SEVERITY_STYLES: Record<string, { badge: string; icon: string }> = {
  danger: { badge: "bg-red-50 text-red-700 border-red-200", icon: "🔴" },
  warning: { badge: "bg-amber-50 text-amber-700 border-amber-200", icon: "⚠️" },
  success: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✅" },
  info: { badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "💡" },
  default: { badge: "bg-gray-50 text-gray-600 border-gray-200", icon: "📊" },
};

function ActionBadge({ severity, action }: { severity: string; action: string }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.default;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}>
      <span className="text-[11px]">{s.icon}</span>
      {action}
    </span>
  );
}

function DaysTag({ days, suggested }: { days: number; suggested: number }) {
  const overdue = days > suggested;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-medium ${
      overdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
    }`}>
      <svg className={`h-3 w-3 ${overdue ? "text-red-400" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
      第 {days} 天
    </span>
  );
}

export default function PortfolioPanel({
  onNavigateToHoldings,
}: {
  onNavigateToHoldings?: () => void;
}) {
  const [adviceList, setAdviceList] = useState<HoldingAdvice[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await fetchHoldingsAdvice();
      setAdviceList(r.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white py-12 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" />
          <p className="text-xs text-[#6B7280]">正在获取持仓数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#111827]">我的持仓</h2>
          {refreshing && (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">{adviceList.length} 只</span>
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            className="text-[#9CA3AF] transition-colors hover:text-[#3B82F6] disabled:opacity-40"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {adviceList.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-[#9CA3AF]">
          暂无持仓
        </div>
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {adviceList.map((a) => {
            const pnlColor = a.pnl_pct >= 0 ? "text-green-600" : "text-red-500";
            const isExpanded = expandedId === a.holding_id;

            return (
              <div key={a.holding_id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.holding_id)}
                  className={`flex w-full flex-col px-5 py-3.5 text-left transition-colors hover:bg-[#FAFBFC] ${isExpanded ? "bg-[#FAFBFC]" : ""}`}
                >
                  {/* Row 1: name + days tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111827]">{a.name}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{a.code}</span>
                      {a.llm_analyzed && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI
                        </span>
                      )}
                    </div>
                    <DaysTag days={a.days_held} suggested={a.suggested_hold_days} />
                  </div>

                  {/* Row 2: PnL + action badge */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-sm font-bold ${pnlColor}`}>
                      {a.pnl_pct >= 0 ? "+" : ""}{a.pnl_pct.toFixed(2)}%
                    </span>
                    <ActionBadge severity={a.severity} action={a.action} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#F3F4F6] bg-[#F8FAFC] px-5 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-[11px] text-[#6B7280]">建议</span>
                      <p className="text-xs leading-relaxed text-[#374151]">{a.reason}</p>
                    </div>
                    <div className="mt-2 flex gap-4 text-[10px] text-[#9CA3AF]">
                      <span>已持 {a.days_held} 天</span>
                      <span>建议持有 {a.suggested_hold_days} 天</span>
                      {a.llm_analyzed && <span className="text-blue-500">AI 分析</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[#E5E7EB] px-5 py-3 text-center">
        <button
          onClick={onNavigateToHoldings}
          className="text-xs font-medium text-[#3B82F6] transition-colors hover:text-blue-700"
        >
          查看更多持仓 →
        </button>
      </div>
    </div>
  );
}
