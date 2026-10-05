"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Heart, LayoutDashboard, MessageCircle, ClipboardList } from "lucide-react";

/** Abas da área do cliente com estado ativo (pill roxa). */
export function ClientTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: "/app", icon: <LayoutDashboard size={15} />, label: "Início" },
    { href: "/app/solicitacoes", icon: <ClipboardList size={15} />, label: "Solicitações" },
    { href: "/app/agendamentos", icon: <CalendarDays size={15} />, label: "Agendamentos" },
    { href: "/mensagens", icon: <MessageCircle size={15} />, label: "Mensagens" },
    { href: "/app/favoritos", icon: <Heart size={15} />, label: "Favoritos" },
  ];

  return (
    <div className="hidden gap-2 md:flex">
      {tabs.map((t) => {
        const active = t.href === "/app" ? pathname === "/app" : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              active
                ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                : "text-slate-500 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            }`}
          >
            {t.icon} {t.label}
          </Link>
        );
      })}
    </div>
  );
}
