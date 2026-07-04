import type { TokenUsage } from "@/lib/api";

export default function TokenSummary({ usage }: { usage: TokenUsage | null }) {
  if (!usage || usage.total_tokens === 0) return null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex items-center justify-center gap-6 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#6B7280]">Prompt</span>
          <span className="text-xs font-mono font-semibold text-[#111827]">{usage.prompt_tokens.toLocaleString()}</span>
        </div>
        <div className="h-3.5 w-px bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#6B7280]">Completion</span>
          <span className="text-xs font-mono font-semibold text-[#111827]">{usage.completion_tokens.toLocaleString()}</span>
        </div>
        <div className="h-3.5 w-px bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#6B7280]">总 Token</span>
          <span className="text-xs font-mono font-bold text-[#111827]">{usage.total_tokens.toLocaleString()}</span>
        </div>
        <div className="h-3.5 w-px bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#6B7280]">模型</span>
          <span className="text-[11px] font-mono text-[#6B7280]">{usage.model}</span>
        </div>
        <div className="h-3.5 w-px bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#6B7280]">费用（估算）</span>
          <span className="text-xs font-mono font-bold text-[#3B82F6]">¥{usage.cost_rmb.toFixed(4)}</span>
        </div>
      </div>
      <div className="border-t border-[#E5E7EB] px-5 py-1.5 text-center text-[9px] text-[#9CA3AF]">
        价格根据当前模型费率自动计算
      </div>
    </div>
  );
}
