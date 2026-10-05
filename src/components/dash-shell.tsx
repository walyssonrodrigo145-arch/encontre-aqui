import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Info } from "lucide-react";
import { Avatar } from "./ui";
import { BrandLogo } from "./brand-logo";
import { MobileTabBar, TabBarSpacer } from "./navbar";
import { DashNav } from "./dash-nav";
import { SidebarUser } from "./sidebar-user";

export interface DashNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export interface DashNavGroup {
  label: string;
  icon?: ReactNode;
  items: DashNavItem[];
}

/**
 * Shell premium dos dashboards (prestador/admin):
 * - Desktop: sidebar escura com seções colapsáveis + pill gradiente no item ativo
 * - Mobile: topbar gradiente compacto + tab bar inferior
 */
export function DashShell({
  title,
  userName,
  userSubtitle,
  groups,
  actions,
  footer,
  showHelp = true,
  children,
}: {
  title: string;
  userName: string;
  userSubtitle: string;
  groups: DashNavGroup[];
  actions?: ReactNode;
  /** Card opcional acima do "Sair" (ex: upsell de impulsionamento) */
  footer?: ReactNode;
  /** Card "Precisa de ajuda?" no rodapé (admin usa false) */
  showHelp?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
      {/* ─── Sidebar desktop ─── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--sidebar)] p-4 lg:flex">
        <Link href="/" className="mb-6 px-1 pt-2 transition hover:opacity-85">
          <BrandLogo variant="dark" />
        </Link>

        <DashNav groups={groups} />

        {footer && <div className="pt-3">{footer}</div>}

        {showHelp && (
          <a
            href="mailto:contato@encontreaqui.com.br"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 transition hover:border-white/20 hover:bg-white/10"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70">
              <Info size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-white">Precisa de ajuda?</span>
              <span className="block text-[11px] text-white/45">Central de ajuda</span>
            </span>
            <ExternalLink size={13} className="shrink-0 text-white/40" />
          </a>
        )}

        <div className="pt-3">
          <SidebarUser userName={userName} userSubtitle={userSubtitle} />
        </div>
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
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          <div className="flex items-center gap-3">{actions}</div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
        <TabBarSpacer />
      </div>

      <MobileTabBar />
    </div>
  );
}
