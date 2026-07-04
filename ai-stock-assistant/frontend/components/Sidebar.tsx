"use client";

type PageView = "home" | "holdings" | "trades" | "backtest" | "token-total";

const NAV_ITEMS: { key: PageView; label: string; icon: string }[] = [
  { key: "home", label: "首页 / 今日推荐", icon: "🏠" },
  { key: "holdings", label: "我的持仓", icon: "💼" },
  { key: "trades", label: "交易记录", icon: "📝" },
  { key: "backtest", label: "回测分析", icon: "📊" },
  { key: "token-total", label: "总计 Token", icon: "🪙" },
];

export default function Sidebar({
  currentPage,
  onNavigate,
}: {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}) {
  return (
    <aside className="fixed left-0 top-0 flex h-full w-[240px] flex-col border-r border-[#E5E7EB] bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6] text-sm font-bold text-white">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-[#111827]">AI Stock Assistant</div>
          <div className="text-[11px] text-[#6B7280]">智能股票分析助手</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${isActive
                  ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                  : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Disclaimer */}
      <div className="border-t border-[#E5E7EB] px-6 py-4">
        <p className="text-[11px] leading-relaxed text-[#9CA3AF]">
          数据仅供参考<br />
          不构成投资建议
        </p>
      </div>
    </aside>
  );
}
