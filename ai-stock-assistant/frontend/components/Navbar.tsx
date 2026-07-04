"use client";

export default function Navbar() {
  return (
    <header className="relative border-b border-slate-800/60 bg-[#0b1120]">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo mark — stylized "A" for AI + A-share */}
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rotate-45 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 opacity-80" />
            <span className="relative text-sm font-black tracking-tight text-white drop-shadow-sm">
              A
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100">
              AI Stock Assistant
            </h1>
            <p className="text-[11px] leading-tight font-medium tracking-wider text-emerald-400/80 uppercase">
              A 股 AI 投研助手
            </p>
          </div>
        </div>

        {/* Right side: status indicator */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-slate-500">系统在线</span>
        </div>
      </div>
    </header>
  );
}
