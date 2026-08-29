import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { Avatar } from "./ui";
import { BrandLogo } from "./brand-logo";
import { MobileTabBar, TabBarSpacer } from "./navbar";

export interface DashNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

/**
 * Shell premium dos dashboards (prestador/admin):
 * - Desktop: sidebar escura com pill violeta de navegação + topbar claro
 * - Mobile: topbar gradiente compacto + tab bar inferior
 */
export function DashShell({
  title,
  userName,
  userSubtitle,
  items,
  actions,
  children,
}: {
  title: string;
  userName: string;
  userSubtitle: string;
  items: DashNavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
      {/* ─── Sidebar desktop ─── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--sidebar)] p-4 lg:flex">
        <Link href="/" className="mb-6 px-1 pt-2 transition hover:opacity-85">
          <BrandLogo variant="dark" />
        </Link>

        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <Avatar name={userName} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-white/50">{userSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-all duration-200 hover:bg-white/5 hover:text-white"
            >
              <span className="transition-colors group-hover:text-[#a5b4fc]">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <form action={logoutAction} className="pt-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition hover:bg-red-500/10 hover:text-red-400">
            <LogOut size={17} /> Sair
          </button>
        </form>
      </aside>

      {/* ─── Conteúdo ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <div className="bg-brand-gradient sticky top-0 z-30 px-4 pb-4 pt-5 lg:hidden">
          <p className="font-display text-lg font-bold text-white">{title}</p>
          <div className="mt-2 flex items-center gap-2.5">
            <Avatar name={userName} size={34} className="ring-2 ring-white/30" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-xs text-white/60">{userSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Topbar desktop */}
        <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-[var(--border)] bg-white/85 px-8 py-4 backdrop-blur-xl lg:flex">
          <h1 className="font-display text-xl font-extrabold text-slate-900">{title}</h1>
          <div className="flex items-center gap-3">{actions}</div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
        <TabBarSpacer />
      </div>

      <MobileTabBar />
    </div>
  );
}
