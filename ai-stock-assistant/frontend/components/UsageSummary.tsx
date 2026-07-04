import type { TokenUsage } from "@/lib/api";

export default function UsageSummary({ usage }: { usage: TokenUsage | null }) {
  if (!usage || usage.total_tokens === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/40 bg-[#0a0f1a] px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span>Prompt <strong className="font-semibold text-slate-400">{usage.prompt_tokens.toLocaleString()}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span>Completion <strong className="font-semibold text-slate-400">{usage.completion_tokens.toLocaleString()}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span>合计 <strong className="font-semibold text-slate-400">{usage.total_tokens.toLocaleString()}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-slate-500">{usage.model}</span>
        <span className="ml-auto text-xs font-bold text-slate-300">
          ¥{usage.cost_rmb.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
