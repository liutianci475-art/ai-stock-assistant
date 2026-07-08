"use client";

import { useState, Fragment, useEffect } from "react";
import type { RecommendationReport, RecommendationItem, AgentDetail } from "@/lib/api";
import { fetchRealtimePrice } from "@/lib/api";

const ACTION_BADGE: Record<string, { label: string; class: string }> = {
  "买入": { label: "买入", class: "bg-blue-100 text-blue-700" },
  "持有": { label: "继续持有", class: "bg-green-100 text-green-700" },
  "观望": { label: "观察", class: "bg-amber-100 text-amber-700" },
  "卖出": { label: "卖出", class: "bg-red-100 text-red-700" },
};

const RANK_STYLES: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: "bg-gradient-to-br from-amber-300 to-amber-500", text: "text-white", ring: "ring-amber-200" },
  2: { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-white", ring: "ring-slate-200" },
  3: { bg: "bg-gradient-to-br from-amber-600 to-amber-700", text: "text-white", ring: "ring-amber-300" },
};

const AGENT_ICONS: Record<string, string> = { news: "📰", technical: "📊", risk: "⚠️" };

const SIGNAL_CLASSES: Record<string, string> = {
  "利好": "text-green-600", "偏利好": "text-green-600",
  "看涨": "text-green-600", "偏看涨": "text-green-600",
  "低风险": "text-green-600", "偏低风险": "text-green-600",
  "中性": "text-blue-600", "震荡": "text-blue-600",
  "中等风险": "text-blue-600",
  "偏利空": "text-orange-600", "偏看跌": "text-orange-600",
  "偏高风险": "text-orange-600",
  "利空": "text-red-600", "看跌": "text-red-600", "高风险": "text-red-600",
};

function getSignalClass(signal: string): string {
  return SIGNAL_CLASSES[signal] || "text-gray-600";
}

function getRankStyle(rank: number) {
  return RANK_STYLES[rank] || { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", ring: "" };
}

function AgentRow({ agent }: { agent: AgentDetail }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <span className="w-5 text-center text-sm">{AGENT_ICONS[agent.name] || "🤖"}</span>
      <span className="w-24 text-xs font-semibold text-[#374151]">{agent.label}</span>
      <span className="w-16 text-xs tracking-wide text-amber-400">{"★".repeat(agent.stars)}{"☆".repeat(5 - agent.stars)}</span>
      <span className={`w-16 text-xs font-medium ${getSignalClass(agent.signal)}`}>{agent.signal}</span>
      <span className="flex-1 text-xs text-[#6B7280] truncate">{agent.summary}</span>
    </div>
  );
}

export default function RecommendationTable({
  report,
  onSelectStock,
  boughtMap,
  onBuy,
  onUndo,
}: {
  report: RecommendationReport;
  loading: boolean;
  onRefresh: () => void;
  onSelectStock: (item: RecommendationItem) => void;
  boughtMap: Record<string, number>;
  onBuy: (code: string, name: string, price: number, quantity?: number) => void;
  onUndo: (code: string) => void;
}) {
  const [buyingCode, setBuyingCode] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [buyModal, setBuyModal] = useState<{ code: string; name: string; price: number; quantity: number; realtimePrice: number | null; loadingPrice: boolean } | null>(null);

  const openBuyModal = async (e: React.MouseEvent, code: string, name: string) => {
    e.stopPropagation();
    setBuyModal({ code, name, price: 0, quantity: 100, realtimePrice: null, loadingPrice: true });
    try {
      const data = await fetchRealtimePrice(code);
      setBuyModal((prev) => prev && { ...prev, realtimePrice: data.price, price: data.price, loadingPrice: false });
    } catch {
      setBuyModal((prev) => prev && { ...prev, loadingPrice: false });
    }
  };

  const confirmBuy = async () => {
    if (!buyModal || !buyModal.price) return;
    setBuyingCode(buyModal.code);
    setBuyModal(null);
    await onBuy(buyModal.code, buyModal.name, buyModal.price, buyModal.quantity);
    setBuyingCode(null);
  };

  const handleUndo = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await onUndo(code);
  };

  const toggleExpand = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setExpandedRow(expandedRow === code ? null : code);
  };

  const items = report.recommendations;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
        <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">今日推荐</h2>
        <button className="text-sm font-medium text-[#3B82F6] transition-colors hover:text-blue-700">查看更多 →</button>
      </div>

      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">排名</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">股票</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">评分</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">AI 建议</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">目标价</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">实时价</th>
              <th className="px-6 pb-3 pt-1 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">止损价</th>
              <th className="px-6 pb-3 pt-1 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#6B7280]">
                  {report.candidate_count > 0 ? "暂无符合条件的推荐" : "请在顶栏设置价格范围后点击「重新推荐」"}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const badge = ACTION_BADGE[item.action] || ACTION_BADGE["观望"];
                const rankStyle = getRankStyle(item.rank);
                let scoreColor: string;
                let ringHex: string;
                if (item.score >= 70) { scoreColor = "text-green-600"; ringHex = "#22c55e"; }
                else if (item.score >= 60) { scoreColor = "text-blue-600"; ringHex = "#2563eb"; }
                else if (item.score >= 50) { scoreColor = "text-orange-500"; ringHex = "#f97316"; }
                else { scoreColor = "text-red-500"; ringHex = "#ef4444"; }

                const isExpanded = expandedRow === item.code;
                return (
                  <Fragment key={item.code}>
                    <tr
                      className="cursor-pointer border-b border-[#F9FAFB] transition-colors hover:bg-[#F5F9FF]"
                    >
                      <td className="px-6 py-4">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${rankStyle.bg} ${rankStyle.text} ring-2 ${rankStyle.ring}`}>
                          {item.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">{item.name}</div>
                            <div className="text-xs text-[#9CA3AF]">{item.code}</div>
                          </div>
                          <button
                            onClick={(e) => toggleExpand(e, item.code)}
                            className="ml-1 flex h-5 w-5 items-center justify-center rounded text-xs text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
                            title="展开 Agent 详情"
                          >
                            <svg className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => onSelectStock(item)}>
                        <div className="relative flex h-14 w-14 items-center justify-center">
                          <svg className="absolute h-14 w-14 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
                            <circle
                              cx="24" cy="24" r="20" fill="none"
                              stroke={ringHex}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeDasharray={125.66}
                              strokeDashoffset={125.66 * (1 - item.score / 100)}
                            />
                          </svg>
                          <span className={`relative text-sm font-bold ${scoreColor}`}>{item.score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => onSelectStock(item)}>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-semibold cursor-pointer" onClick={() => onSelectStock(item)}>
                        ¥{item.target_price?.toFixed(3) ?? "--"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#111827] font-bold cursor-pointer" onClick={() => onSelectStock(item)}>
                        ¥{item.close_price.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-500 cursor-pointer" onClick={() => onSelectStock(item)}>
                        ¥{item.stop_loss_price?.toFixed(3) ?? "--"}
                      </td>
                      <td className="px-6 py-4 text-center cursor-pointer" onClick={() => onSelectStock(item)}>
                        {boughtMap[item.code] ? (
                          <button
                            onClick={(e) => handleUndo(e, item.code)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                          >
                            撤销
                          </button>
                        ) : (
                          <button
                            onClick={(e) => openBuyModal(e, item.code, item.name)}
                            disabled={buyingCode === item.code}
                            className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                          >
                            {buyingCode === item.code ? "..." : "买入"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && item.agent_details && item.agent_details.length > 0 && (
                      <tr key={`${item.code}-agents`}>
                        <td colSpan={7} className="bg-[#FAFBFC] px-6 py-3">
                          <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                            <div className="flex items-center gap-3 border-b border-[#F3F4F6] pb-1.5 mb-1">
                              <span className="text-xs font-bold text-[#374151]">多 Agent 分析</span>
                              <span className="text-xs text-[#9CA3AF]">
                                点击股票行查看完整详情
                              </span>
                            </div>
                            <div className="divide-y divide-[#F3F4F6]">
                              {item.agent_details.map((agent) => (
                                <AgentRow key={agent.name} agent={agent} />
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Buy Modal */}
      {buyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setBuyModal(null)}>
          <div className="w-[360px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827]">买入确认</h3>
            <div className="mt-1 text-sm text-[#6B7280]">{buyModal.name} ({buyModal.code})</div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#6B7280]">实时价</label>
                {buyModal.loadingPrice ? (
                  <div className="mt-1 h-8 animate-pulse rounded-lg bg-[#F3F4F6]" />
                ) : (
                  <input
                    type="number"
                    step={0.01}
                    value={buyModal.price}
                    onChange={(e) => setBuyModal({ ...buyModal, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none focus:border-[#3B82F6]"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280]">买入数量（股）</label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={buyModal.quantity}
                  onChange={(e) => setBuyModal({ ...buyModal, quantity: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none focus:border-[#3B82F6]"
                />
              </div>
              {!buyModal.loadingPrice && buyModal.price > 0 && (
                <div className="rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
                  预计成本：¥{(buyModal.price * buyModal.quantity).toFixed(2)}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setBuyModal(null)} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">
                取消
              </button>
              <button
                onClick={confirmBuy}
                disabled={!buyModal.price || buyModal.price <= 0 || buyModal.quantity <= 0}
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                确认买入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-3">
        <span className="text-xs text-[#9CA3AF]">候选 {report.candidate_count} 只 · 分析 {report.analyzed_count} 只</span>
        <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-400" />持有</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />观察</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" />买入</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />卖出</span>
        </div>
      </div>
    </div>
  );
}
