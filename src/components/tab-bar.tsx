"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, ClipboardList, User, LayoutDashboard, CalendarDays, MessageCircle, BarChart3, FolderOpen, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  home: Home,
  search: Search,
  heart: Heart,
  clipboard: ClipboardList,
  user: User,
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  chat: MessageCircle,
  chart: BarChart3,
  folder: FolderOpen,
  wrench: Wrench,
};

export function TabBarClient({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((tab) => {
          const Icon = ICONS[tab.icon] ?? Home;
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                active ? "text-[var(--primary)]" : "text-slate-400 hover:text-slate-600",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all",
                  active && "bg-[var(--primary-light)]",
                )}
              >
                <Icon size={19} />
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
