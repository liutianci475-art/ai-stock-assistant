"use client";

import { useState } from "react";
import type { FilterSettings } from "@/lib/api";
import StockSearch from "./StockSearch";

export default function DashboardHeader({
  reportDate,
  loading,
  onRefresh,
  filterSettings,
  onAnalyze,
  onSearchStock,
}: {
  reportDate?: string;
  loading: boolean;
  onRefresh: () => void;
  filterSettings?: FilterSettings | null;
  onAnalyze?: (min: number, max: number) => void;
  onSearchStock?: (code: string, name: string) => void;
}) {
  const [minPrice, setMinPrice] = useState(filterSettings?.min_stock_price ?? 2);
  const [maxPrice, setMaxPrice] = useState(filterSettings?.max_stock_price ?? 30);
  const [enabled, setEnabled] = useState(filterSettings?.low_price_mode ?? true);

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-[#E5E7EB] bg-white px-8">
      {/* Left */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-lg font-bold text-[#111827]">今日概览</h1>
          <p className="text-xs text-[#6B7280]">{reportDate || "加载中..."}</p>
        </div>

        {/* Price filter */}
        <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]/30"
            />
            <span className="text-[11px] font-medium text-[#6B7280]">价格筛选</span>
          </label>
          <span className="text-[11px] text-[#D1D5DB]">|</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              step={0.5}
              value={enabled ? minPrice : 0}
              disabled={!enabled}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="w-14 rounded border-0 bg-transparent p-0 text-xs font-mono font-semibold text-[#111827] outline-none focus:ring-0 disabled:opacity-30"
            />
            <span className="text-[10px] text-[#9CA3AF]">—</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={enabled ? maxPrice : 9999}
              disabled={!enabled}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-14 rounded border-0 bg-transparent p-0 text-xs font-mono font-semibold text-[#111827] outline-none focus:ring-0 disabled:opacity-30"
            />
            <span className="text-[10px] text-[#9CA3AF]">元</span>
          </div>
          <button
            onClick={() => onAnalyze?.(minPrice, maxPrice)}
            disabled={loading}
            className="rounded-md bg-[#3B82F6] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "重新推荐"}
          </button>
        </div>
      </div>

      {/* Right: search + refresh */}
      <div className="flex items-center gap-3">
        {onSearchStock && <StockSearch onSelect={onSearchStock} />}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#111827] disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>
    </header>
  );
}
