"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, History, Settings, Zap } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", desc: "下载视频", icon: Download },
  { href: "/records", label: "Records", desc: "操作记录", icon: History },
  { href: "/settings", label: "Settings", desc: "系统设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r border-edge bg-surface-1 z-50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-amber to-amber-dim flex items-center justify-center shadow-lg shadow-amber/20">
            <Zap className="w-[18px] h-[18px] text-black" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="text-[15px] font-bold tracking-tight text-ink">yt-dlp</div>
            <div className="text-[10px] font-mono text-ink-muted tracking-widest uppercase mt-0.5">Web UI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                ${active
                  ? "bg-amber-ghost border border-amber/15"
                  : "border border-transparent hover:bg-surface-3 hover:border-edge"
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  active ? "text-amber" : "text-ink-muted group-hover:text-ink-soft"
                }`}
                strokeWidth={1.8}
              />
              <div className="min-w-0">
                <div className={`text-[13px] font-medium leading-tight ${active ? "text-amber" : "text-ink-soft group-hover:text-ink"}`}>
                  {item.label}
                </div>
                <div className={`text-[10px] leading-tight mt-0.5 ${active ? "text-amber/50" : "text-ink-muted"}`}>
                  {item.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-edge">
        <div className="text-[10px] font-mono text-ink-muted text-center tracking-wider">
          powered by yt-dlp
        </div>
      </div>
    </aside>
  );
}
