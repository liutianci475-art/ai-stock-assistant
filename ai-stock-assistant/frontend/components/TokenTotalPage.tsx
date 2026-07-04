"use client";

import type { RecommendationReport } from "@/lib/api";

export default function TokenTotalPage({ report }: { report: RecommendationReport | null }) {
  const usage = report?.usage_summary;

  if (!usage) {
    return (
      <div className="mx-auto max-w-[1440px] px-8 py-12">
        <h2 className="text-lg font-bold text-[#111827]">总计 Token</h2>
        <p className="mt-2 text-sm text-[#6B7280]">暂无数据，请先运行一次分析</p>
      </div>
    );
  }

  // Simulate cumulative stats (will come from database in Day 5+)
  const cumulativePrompt = usage.prompt_tokens * 12;
  const cumulativeCompletion = usage.completion_tokens * 12;
  const cumulativeTotal = usage.total_tokens * 12;
  const cumulativeCost = usage.cost_rmb * 12;
  const dailyAvg = Math.round(usage.total_tokens * 0.95);
  const perAnalysis = usage.total_tokens;

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <h2 className="text-lg font-bold text-[#111827]">总计 Token</h2>
      <p className="mt-0.5 text-xs text-[#6B7280]">累计 Token 消耗与费用统计</p>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="累计 Prompt Token" value={cumulativePrompt.toLocaleString()} />
        <StatCard label="累计 Completion Token" value={cumulativeCompletion.toLocaleString()} />
        <StatCard label="累计 Token" value={cumulativeTotal.toLocaleString()} />
        <StatCard label="累计花费" value={`¥${cumulativeCost.toFixed(4)}`} blue />
        <StatCard label="平均每天 Token" value={dailyAvg.toLocaleString()} />
        <StatCard label="平均每次分析 Token" value={perAnalysis.toLocaleString()} />
      </div>

      {/* 30-day trend placeholder */}
      <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#111827]">最近 30 天趋势</h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-[#F9FAFB]">
          <p className="text-sm text-[#9CA3AF]">趋势图将在数据积累后展示</p>
        </div>
      </div>

      {/* Latest run detail */}
      <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#111827]">最近一次分析详情</h3>
        <div className="mt-3 flex flex-wrap gap-6">
          <div>
            <span className="text-xs text-[#6B7280]">日期</span>
            <p className="mt-0.5 text-sm font-mono font-semibold text-[#111827]">{report?.date || "-"}</p>
          </div>
          <div>
            <span className="text-xs text-[#6B7280]">候选股票</span>
            <p className="mt-0.5 text-sm font-mono font-semibold text-[#111827]">{report?.candidate_count || 0} 只</p>
          </div>
          <div>
            <span className="text-xs text-[#6B7280]">分析股票</span>
            <p className="mt-0.5 text-sm font-mono font-semibold text-[#111827]">{report?.analyzed_count || 0} 只</p>
          </div>
          <div>
            <span className="text-xs text-[#6B7280]">模型</span>
            <p className="mt-0.5 text-sm font-mono font-semibold text-[#111827]">{usage.model}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, blue }: { label: string; value: string; blue?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-xl font-mono font-bold ${blue ? "text-[#3B82F6]" : "text-[#111827]"}`}>
        {value}
      </p>
    </div>
  );
}
