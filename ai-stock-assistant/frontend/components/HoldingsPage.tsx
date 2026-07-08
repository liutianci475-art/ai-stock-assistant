"use client";

import { useEffect, useState, useCallback } from "react";
import type { HoldingItem, HoldingListResponse } from "@/lib/api";
import {
  fetchHoldings,
  updateHolding,
  sellHolding,
  deleteHolding,
  addPosition,
  fetchRealtimePrice,
  createSellOrder,
  updateSellOrderPrice,
  confirmSell,
  cancelSellOrder,
} from "@/lib/api";

type Tab = "holding" | "sold";

export default function HoldingsPage({ onHoldingDeleted }: { onHoldingDeleted?: (code: string) => void }) {
  const [tab, setTab] = useState<Tab>("holding");
  const [holdings, setHoldings] = useState<HoldingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editBp, setEditBp] = useState("");
  const [editSl, setEditSl] = useState("");
  const [editTp, setEditTp] = useState("");
  const [sellId, setSellId] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [addModal, setAddModal] = useState<{ h: HoldingItem; addPrice: number; addQty: number; loadingPrice: boolean } | null>(null);
  const [sellOrderModal, setSellOrderModal] = useState<{ h: HoldingItem; price: number; loadingPrice: boolean } | null>(null);
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
        buy_price: editBp ? parseFloat(editBp) : undefined,
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

  const openAddModal = async (h: HoldingItem) => {
    const suggested = Math.max(100, Math.round(h.quantity * 0.5 / 100) * 100);
    setAddModal({ h, addPrice: 0, addQty: suggested, loadingPrice: true });
    try {
      const data = await fetchRealtimePrice(h.code);
      setAddModal((prev) => prev && { ...prev, addPrice: data.price, loadingPrice: false });
    } catch {
      setAddModal((prev) => prev && { ...prev, loadingPrice: false });
    }
  };

  const handleAddPosition = async () => {
    if (!addModal || !addModal.addPrice || !addModal.addQty) return;
    setSubmitting(true);
    try {
      await addPosition(addModal.h.id, { add_price: addModal.addPrice, add_quantity: addModal.addQty });
      setAddModal(null);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const openSellOrderModal = async (h: HoldingItem) => {
    setSellOrderModal({ h, price: h.current_price, loadingPrice: true });
    try {
      const data = await fetchRealtimePrice(h.code);
      setSellOrderModal((prev) => prev && { ...prev, price: data.price, loadingPrice: false });
    } catch {
      setSellOrderModal((prev) => prev && { ...prev, loadingPrice: false });
    }
  };

  const handleCreateSellOrder = async () => {
    if (!sellOrderModal) return;
    setSubmitting(true);
    try {
      await createSellOrder(sellOrderModal.h.id, sellOrderModal.price);
      setSellOrderModal(null);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const handleUpdateSellOrder = async (h: HoldingItem) => {
    setSubmitting(true);
    try {
      await updateSellOrderPrice(h.id, h.sell_price);
      setEditId(null);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const handleConfirmSell = async (h: HoldingItem) => {
    setSubmitting(true);
    try {
      await confirmSell(h.id);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const handleCancelSell = async (h: HoldingItem) => {
    setSubmitting(true);
    try {
      await cancelSellOrder(h.id);
      load(tab);
    } catch {}
    setSubmitting(false);
  };

  const pnlColor = (h: HoldingItem) => {
    if (h.pnl_pct == null) return "text-[#6B7280]";
    return h.pnl_pct >= 0 ? "text-red-500" : "text-green-600";
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
            <div className={`text-xl font-bold ${holdings.total_pnl >= 0 ? "text-red-500" : "text-green-600"}`}>
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
                        {h.status === "pending" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">挂单中</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-[#6B7280]">
                        <span>持仓价 ¥{h.buy_price.toFixed(3)}</span>
                        <span>现价 ¥{h.current_price.toFixed(3)}</span>
                        <span>数量 {h.quantity} 股</span>
                        {h.status === "pending" && (
                          <span className="font-semibold text-amber-600">挂单价 ¥{h.sell_price.toFixed(3)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === "holding" && h.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleConfirmSell(h)} disabled={submitting}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                        {submitting ? "..." : "确认成交"}
                      </button>
                      <button onClick={() => handleCancelSell(h)} disabled={submitting}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50">
                        取消挂单
                      </button>
                    </div>
                  )}

                  {tab === "holding" && h.status === "holding" && (
                    <div className="flex items-center gap-2">
                      {sellId === h.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" step={0.001} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="卖出价" className="w-20 rounded border border-[#E5E7EB] px-2 py-1 text-xs outline-none focus:border-[#3B82F6]" />
                          <button onClick={() => handleSell(h)} disabled={submitting || !sellPrice} className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">{submitting ? "..." : "确认"}</button>
                          <button onClick={() => setSellId(null)} className="rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs text-[#6B7280] hover:bg-[#F9FAFB]">取消</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => openAddModal(h)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100">加仓</button>
                          <button onClick={() => openSellOrderModal(h)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-100">挂单卖出</button>
                          <button onClick={() => { setSellId(h.id); setSellPrice(h.current_price.toFixed(3)); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100">立即卖出</button>
                          <button onClick={() => handleDelete(h)} className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-red-500">撤销</button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit buy_price */}
                <div className="mt-3 flex items-center gap-4 text-xs text-[#6B7280]">
                  {editId === h.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1">
                        <span className="text-[#6B7280]">购入价</span>
                        <input type="number" step={0.001} value={editBp} onChange={(e) => setEditBp(e.target.value)} className="w-28 rounded border border-[#E5E7EB] px-2 py-1 text-xs outline-none focus:border-[#3B82F6]" />
                      </label>
                      <button onClick={() => handleSaveEdit(h)} disabled={submitting} className="rounded bg-[#3B82F6] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "..." : "保存"}</button>
                      <button onClick={() => setEditId(null)} className="text-[#9CA3AF] hover:text-[#6B7280]">取消</button>
                    </div>
                  ) : (
                    <>
                      <span>购入价 ¥{h.buy_price.toFixed(3)}</span>
                      {h.stop_loss > 0 && <span className="text-red-500">止损 ¥{h.stop_loss.toFixed(3)}</span>}
                      {h.take_profit > 0 && <span className="text-green-600">止盈 ¥{h.take_profit.toFixed(3)}</span>}
                      {tab === "holding" && h.status === "holding" && (
                        <button onClick={() => { setEditId(h.id); setEditBp(h.buy_price.toFixed(3)); setEditSl(""); setEditTp(""); }} className="text-[#3B82F6] hover:text-blue-700">修改</button>
                      )}
                      {tab === "holding" && h.status === "pending" && (
                        <button onClick={() => { setEditId(h.id); setEditBp(h.sell_price.toFixed(3)); }} className="text-amber-600 hover:text-amber-700">修改挂单价</button>
                      )}
                    </>
                  )}
                </div>

                {/* Pending info */}
                {tab === "holding" && h.status === "pending" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#6B7280]">
                    <span>挂单 {h.updated_at.slice(0, 10)}</span>
                    {h.sell_price > 0 && h.buy_price > 0 && (
                      <span className={h.sell_price >= h.buy_price ? "text-red-500" : "text-green-600"}>
                        预计盈亏 {h.sell_price >= h.buy_price ? "+" : ""}
                        {((h.sell_price - h.buy_price) / h.buy_price * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}

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

      {/* Add Position Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setAddModal(null)}>
          <div className="w-[380px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827]">加仓确认</h3>
            <div className="mt-1 text-sm text-[#6B7280]">{addModal.h.name} ({addModal.h.code})</div>
            <div className="mt-3 flex gap-4 rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
              <span>当前 {addModal.h.quantity} 股</span>
              <span>均价 ¥{addModal.h.buy_price.toFixed(3)}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#6B7280]">加仓价格</label>
                {addModal.loadingPrice ? (
                  <div className="mt-1 h-8 animate-pulse rounded-lg bg-[#F3F4F6]" />
                ) : (
                  <input type="number" step={0.001} value={addModal.addPrice} onChange={(e) => setAddModal({ ...addModal, addPrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none focus:border-[#3B82F6]" />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280]">加仓数量（股，100 的整数倍）</label>
                <input type="number" min={100} step={100} value={addModal.addQty} onChange={(e) => setAddModal({ ...addModal, addQty: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none focus:border-[#3B82F6]" />
                <p className="mt-0.5 text-[10px] text-[#9CA3AF]">建议加仓 {Math.max(100, Math.round(addModal.h.quantity * 0.5 / 100) * 100)} 股</p>
              </div>
              {!addModal.loadingPrice && addModal.addPrice > 0 && addModal.addQty > 0 && (
                <div className="rounded-lg bg-[#EEF2FF] px-3 py-2 text-xs text-[#4F46E5]">
                  加仓后：{(addModal.h.quantity + addModal.addQty)} 股，
                  均价 ¥{((addModal.h.buy_price * addModal.h.quantity + addModal.addPrice * addModal.addQty) / (addModal.h.quantity + addModal.addQty)).toFixed(3)}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAddModal(null)} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">取消</button>
              <button onClick={handleAddPosition} disabled={!addModal.addPrice || addModal.addPrice <= 0 || addModal.addQty < 100}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? "..." : "确认加仓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Order Modal */}
      {sellOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSellOrderModal(null)}>
          <div className="w-[380px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827]">挂单卖出</h3>
            <div className="mt-1 text-sm text-[#6B7280]">{sellOrderModal.h.name} ({sellOrderModal.h.code})</div>
            <div className="mt-3 flex gap-4 rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
              <span>持仓价 ¥{sellOrderModal.h.buy_price.toFixed(3)}</span>
              <span>现价 ¥{sellOrderModal.h.current_price.toFixed(3)}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#6B7280]">挂单卖出价</label>
                {sellOrderModal.loadingPrice ? (
                  <div className="mt-1 h-8 animate-pulse rounded-lg bg-[#F3F4F6]" />
                ) : (
                  <input type="number" step={0.001} value={sellOrderModal.price}
                    onChange={(e) => setSellOrderModal({ ...sellOrderModal, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none focus:border-[#3B82F6]" />
                )}
              </div>
              {!sellOrderModal.loadingPrice && sellOrderModal.price > 0 && (
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  sellOrderModal.price >= sellOrderModal.h.buy_price
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-600"
                }`}>
                  预计盈亏 {sellOrderModal.price >= sellOrderModal.h.buy_price ? "+" : ""}
                  {((sellOrderModal.price - sellOrderModal.h.buy_price) / sellOrderModal.h.buy_price * 100).toFixed(2)}%
                  （¥{((sellOrderModal.price - sellOrderModal.h.buy_price) * sellOrderModal.h.quantity).toFixed(2)}）
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSellOrderModal(null)} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">取消</button>
              <button onClick={handleCreateSellOrder} disabled={!sellOrderModal.price || sellOrderModal.price <= 0}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                {submitting ? "..." : "确认挂单"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
