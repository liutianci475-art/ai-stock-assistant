"use client";

import { useEffect, useState } from "react";
import type { SingleAnalysisResponse, RecommendationItem, KlineBar } from "@/lib/api";
import { fetchSingleAnalysis, fetchKline } from "@/lib/api";
import KlineChart from "./KlineChart";
import { MacdChart, RsiChart, BollChart } from "./IndicatorCharts";
import type { IndicatorRecord } from "@/lib/api";
import { fetchIndicatorsHistory } from "@/lib/api";

interface StockDetailProps {
  stock: RecommendationItem;
  onBack: () => void;
}

const AGENT_ICONS: Record<string, string> = {
  news: "📰",
  technical: "📊",
  risk: "⚠️",
};

const LOADING_STEPS = [
  "获取 K 线数据...",
  "计算技术指标...",
  "📰 NewsAgent 分析新闻...",
  "📊 TechnicalAgent 分析技术面...",
  "⚠️ RiskAgent 风险评估...",
  "🧠 DecisionAgent 综合决策...",
];

function AgentCard({ agent }: { agent: SingleAnalysisResponse["agent_details"][number] }) {
  const signalColors: Record<string, string> = {
    "利好": "text-green-600 bg-green-50 border-green-200",
    "偏利好": "text-green-600 bg-green-50 border-green-200",
    "看涨": "text-green-600 bg-green-50 border-green-200",
    "偏看涨": "text-green-600 bg-green-50 border-green-200",
    "低风险": "text-green-600 bg-green-50 border-green-200",
    "偏低风险": "text-green-600 bg-green-50 border-green-200",
    "中性": "text-blue-600 bg-blue-50 border-blue-200",
    "震荡": "text-blue-600 bg-blue-50 border-blue-200",
    "中等风险": "text-blue-600 bg-blue-50 border-blue-200",
    "偏利空": "text-orange-600 bg-orange-50 border-orange-200",
    "偏看跌": "text-orange-600 bg-orange-50 border-orange-200",
    "偏高风险": "text-orange-600 bg-orange-50 border-orange-200",
    "利空": "text-red-600 bg-red-50 border-red-200",
    "看跌": "text-red-600 bg-red-50 border-red-200",
    "高风险": "text-red-600 bg-red-50 border-red-200",
  };
  const signalClass = signalColors[agent.signal] || "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{AGENT_ICONS[agent.name] || "🤖"}</span>
          <span className="text-sm font-bold text-[#111827]">{agent.label}</span>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${signalClass}`}>
          {agent.signal}
        </span>
      </div>
      <div className="mt-2 text-lg tracking-wide text-amber-400">
        {"★".repeat(agent.stars)}{"☆".repeat(5 - agent.stars)}
      </div>
      <p className="mt-1 text-xs font-medium text-[#374151]">{agent.summary}</p>
      {agent.details && (
        <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{agent.details}</p>
      )}
    </div>
  );
}

export default function StockDetail({ stock, onBack }: StockDetailProps) {
  const code = stock.code;
  const name = stock.name;
  const [data, setData] = useState<SingleAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [klineData, setKlineData] = useState<KlineBar[]>([]);
  const [indicatorData, setIndicatorData] = useState<IndicatorRecord[]>([]);
  const [useCached, setUseCached] = useState(false);

  useEffect(() => {
    const hasCached = stock.agent_details && stock.agent_details.length > 0;
    if (hasCached) {
      setUseCached(true);
      setLoading(false);
      setData({
        code: stock.code,
        name: stock.name,
        score: stock.score,
        stars: stock.stars,
        action: stock.action,
        reason: stock.reason,
        close_price: stock.close_price,
        passes_price_filter: stock.passes_price_filter ?? null,
        token_usage: stock.token_usage,
        agent_details: stock.agent_details,
      });
      fetchKline(code, 60).then((k) => setKlineData(k.klines)).catch(() => {});
      fetchIndicatorsHistory(code, 120).then((r) => setIndicatorData(r.records)).catch(() => {});
      return;
    }

    setUseCached(false);
    setLoading(true);
    setError("");
    setStep(0);
    setKlineData([]);

    const advance = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 5000);

    Promise.all([
      fetchKline(code, 60).then((k) => { setKlineData(k.klines); setStep(2); return k; }),
      fetchIndicatorsHistory(code, 120).then((r) => { setIndicatorData(r.records); return r; }),
      fetchSingleAnalysis(code, name).then((a) => { setStep(5); return a; }),
    ])
      .then(([, , analysis]) => setData(analysis))
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); clearInterval(advance); });

    return () => clearInterval(advance);
  }, [code, name, stock]);

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-[#3B82F6] transition-colors hover:text-blue-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-12 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-500" />
          <p className="mt-4 text-sm font-medium text-[#374151]">AI 分析中...</p>
          <p className="mt-1 text-xs text-[#6B7280]">{LOADING_STEPS[step]}</p>
          <div className="mt-4 flex gap-1">
            {LOADING_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-[#3B82F6]" : "bg-[#E5E7EB]"}`} />
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-500">加载失败: {error}</p>}
      {!data && !loading && !error && <p className="text-sm text-[#6B7280]">暂无数据</p>}
      {!data || loading ? null : (
        <>
          {useCached && (
            <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-700">
              <span>✓ 今日推荐已预加载，无需重新分析</span>
            </div>
          )}

          {/* Stock header */}
          <div className="flex items-start justify-between rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#111827]">{data.name}</h1>
                <span className="text-sm font-mono text-[#9CA3AF]">{data.code}</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  data.action === "买入" ? "bg-blue-100 text-blue-700" :
                  data.action === "卖出" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {data.action === "观望" ? "观察" : data.action}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <div className="text-xs font-medium text-[#6B7280]">当前价格</div>
                  <div className="mt-0.5 text-xl font-bold text-[#111827]">¥{data.close_price.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#6B7280]">AI 评分</div>
                  <div className={`mt-0.5 text-xl font-bold ${data.score >= 70 ? "text-green-600" : data.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {data.score}/100
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#6B7280]">星级</div>
                  <div className="mt-0.5 text-lg tracking-wide text-amber-400">{"★".repeat(data.stars)}{"☆".repeat(5 - data.stars)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* K-line Chart */}
          {klineData.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-[#111827]">K 线图</h2>
              <KlineChart data={klineData} />
            </div>
          )}

          {/* Indicator sub-charts */}
          {indicatorData.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MacdChart data={indicatorData} />
              <RsiChart data={indicatorData} />
              <BollChart data={indicatorData} />
            </div>
          )}

          {/* Agent details grid */}
          {data.agent_details && data.agent_details.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 text-base font-bold text-[#111827]">多 Agent 分析</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.agent_details.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>
          )}

          {/* Decision */}
          <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#111827]">综合决策</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              {data.reason}
            </p>
          </div>

          {/* Token usage */}
          {data.token_usage && (
            <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-[#111827]">Token 消耗</h2>
              <div className="mt-2 flex items-center gap-4 text-xs font-mono text-[#6B7280]">
                <span>Prompt {data.token_usage.prompt_tokens.toLocaleString()}</span>
                <span>|</span>
                <span>Completion {data.token_usage.completion_tokens.toLocaleString()}</span>
                <span>|</span>
                <span>合计 {data.token_usage.total_tokens.toLocaleString()}</span>
                <span>|</span>
                <span className="text-[#3B82F6]">¥{data.token_usage.cost_rmb.toFixed(4)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
