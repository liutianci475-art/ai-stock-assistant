"use client";

export default function MarketOverview() {
  const markets = [
    { label: "上证指数", value: "3,278.46", change: "+0.62%", up: true },
    { label: "深证指数", value: "10,452.31", change: "+0.88%", up: true },
    { label: "创业板", value: "2,185.67", change: "-0.23%", up: false },
    { label: "成交额", value: "9,856 亿", change: "", up: null },
  ];

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="border-b border-[#E5E7EB] px-5 py-4">
        <h2 className="text-base font-bold text-[#111827]">市场概览</h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#F3F4F6]">
        {markets.map((m) => (
          <div key={m.label} className="bg-white px-5 py-3.5">
            <div className="text-[11px] font-medium text-[#6B7280]">{m.label}</div>
            <div className="mt-0.5 text-sm font-bold text-[#111827]">{m.value}</div>
            {m.change && (
              <div className={`text-xs font-medium ${m.up ? "text-green-600" : "text-red-500"}`}>
                {m.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
