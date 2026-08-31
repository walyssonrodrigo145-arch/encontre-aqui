"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashNavItem } from "@/components/dash-shell";

/** Navegação lateral com estado ativo (pill gradiente no item atual). */
export function DashNav({ items }: { items: DashNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-brand-gradient text-white shadow-[0_6px_18px_rgba(109,74,255,0.35)]"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={`transition-colors ${active ? "text-white" : "text-white/60 group-hover:text-[#a5b4fc]"}`}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-[var(--primary)] text-white"
                }`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
