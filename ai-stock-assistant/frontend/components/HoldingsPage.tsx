"use client";

import { useEffect, useState, useCallback } from "react";
import type { HoldingItem, HoldingListResponse } from "@/lib/api";
import { fetchHoldings, updateHolding, sellHolding, deleteHolding } from "@/lib/api";

type Tab = "holding" | "sold";

export default function HoldingsPage({ onHoldingDeleted }: { onHoldingDeleted?: (code: string) => void }) {
  const [tab, setTab] = useState<Tab>("holding");
  const [holdings, setHoldings] = useState<HoldingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editSl, setEditSl] = useState("");
  const [editTp, setEditTp] = useState("");
  const [sellId, setSellId] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((status: Tab) => {
    setLoading(true);
    fetchHoldings(status)
      .then(setHoldings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const handleSaveEdit = async (h: HoldingItem) => {
    setSubmitting(true);
    try {
      await updateHolding(h.id, {
        stop_loss: editSl ? parseFloat(editSl) : undefined,
        take_profit: editTp ? parseFloat(editTp) : undefined,
      });
      setEditId(null);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const handleSell = async (h: HoldingItem) => {
    if (!sellPrice) return;
    setSubmitting(true);
    try {
      await sellHolding(h.id, parseFloat(sellPrice), "手动卖出");
      setSellId(null);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async (h: HoldingItem) => {
    if (!confirm(`撤销 ${h.name} 的建仓？`)) return;
    try {
      await deleteHolding(h.id);
      onHoldingDeleted?.(h.code);
      load(tab);
    } catch {}
  };

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">我的持仓</h2>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {holdings ? `共 ${holdings.count} 只` : "加载中..."}
            {holdings && tab === "holding" && ` · 总市值 ¥${holdings.total_market_value.toFixed(2)}`}
          </p>
        </div>
        {holdings && tab === "holding" && holdings.total_cost > 0 && (
          <div className="text-right">
            <div className={`text-xl font-bold ${holdings.total_pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
              {holdings.total_pnl >= 0 ? "+" : ""}{holdings.total_pnl_pct.toFixed(2)}%
            </div>
            <div className="text-xs text-[#6B7280]">
              总盈亏 ¥{holdings.total_pnl.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-[#F3F4F6] p-1 w-fit">
        <button onClick={() => setTab("holding")} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "holding" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>持有中</button>
        <button onClick={() => setTab("sold")} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "sold" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>已平仓</button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-500" />
          </div>
        ) : !holdings || holdings.items.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center">
            <p className="text-sm text-[#6B7280]">{tab === "holding" ? "暂无持仓" : "暂无平仓记录"}</p>
            {tab === "holding" && <p className="mt-1 text-xs text-[#9CA3AF]">在今日推荐列表中可以买入建仓</p>}
          </div>
        ) : (
          <div className="grid gap-4">
            {holdings.items.map((h) => (
              <div key={h.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3F4F6] text-sm font-bold text-[#6B7280]">{h.name.charAt(0)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#111827]">{h.name}</h3>
                        <span className="text-xs text-[#9CA3AF]">{h.code}</span>
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">{h.days_held ?? "-"} 天</span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-[#6B7280]">
                        <span>持仓价 ¥{h.buy_price.toFixed(2)}</span>
                        <span>现价 ¥{h.current_price.toFixed(2)}</span>
                        <span>数量 {h.quantity} 股</span>
                      </div>
                    </div>
                  </div>
                  {tab === "holding" && (
                    <div className="flex items-center gap-2">
                      {sellId === h.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" step={0.01} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="卖出价" className="w-20 rounded border border-[#E5E7EB] px-2 py-1 text-xs outline-none focus:border-[#3B82F6]" />
                          <button onClick={() => handleSell(h)} disabled={submitting || !sellPrice} className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">{submitting ? "..." : "确认"}</button>
                          <button onClick={() => setSellId(null)} className="rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs text-[#6B7280] hover:bg-[#F9FAFB]">取消</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setSellId(h.id); setSellPrice(h.current_price.toFixed(2)); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100">卖出</button>
                          <button onClick={() => handleDelete(h)} className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-red-500">撤销</button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Stop loss / Take profit */}
                <div className="mt-3 flex items-center gap-4 text-xs text-[#6B7280]">
                  {editId === h.id ? (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <span className="text-red-500">止损</span>
                        <input type="number" step={0.01} value={editSl} onChange={(e) => setEditSl(e.target.value)} className="w-16 rounded border border-[#E5E7EB] px-1.5 py-0.5 text-xs outline-none focus:border-[#3B82F6]" />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-green-600">止盈</span>
                        <input type="number" step={0.01} value={editTp} onChange={(e) => setEditTp(e.target.value)} className="w-16 rounded border border-[#E5E7EB] px-1.5 py-0.5 text-xs outline-none focus:border-[#3B82F6]" />
                      </label>
                      <button onClick={() => handleSaveEdit(h)} disabled={submitting} className="rounded bg-[#3B82F6] px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "..." : "保存"}</button>
                      <button onClick={() => setEditId(null)} className="text-[#9CA3AF] hover:text-[#6B7280]">取消</button>
                    </div>
                  ) : (
                    <>
                      {h.stop_loss > 0 && <span className="text-red-500">止损 ¥{h.stop_loss.toFixed(2)}</span>}
                      {h.take_profit > 0 && <span className="text-green-600">止盈 ¥{h.take_profit.toFixed(2)}</span>}
                      {tab === "holding" && (
                        <button onClick={() => { setEditId(h.id); setEditSl(h.stop_loss > 0 ? h.stop_loss.toFixed(2) : ""); setEditTp(h.take_profit > 0 ? h.take_profit.toFixed(2) : ""); }} className="text-[#3B82F6] hover:text-blue-700">修改</button>
                      )}
                    </>
                  )}
                </div>

                {/* Sold info */}
                {tab === "sold" && (
                  <div className="mt-3 text-xs text-[#6B7280]">
                    买入 {h.buy_date} · 更新于 {h.updated_at.slice(0, 10)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
