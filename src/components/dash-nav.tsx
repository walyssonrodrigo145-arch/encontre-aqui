"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DashNavGroup } from "@/components/dash-shell";

/**
 * Navegação lateral agrupada por seções colapsáveis.
 * Item ativo = match mais específico do pathname.
 */
export function DashNav({ groups }: { groups: DashNavGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const activeHref = useMemo(() => {
    const all = groups.flatMap((g) => g.items);
    const matches = all
      .filter((i) =>
        i.href === "/admin" || i.href === "/prestador/painel"
          ? pathname === i.href
          : pathname === i.href || pathname.startsWith(`${i.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href ?? "";
  }, [groups, pathname]);

  // seção da página ativa (para abrir automaticamente ao navegar)
  const activeGroup = useMemo(
    () => groups.find((g) => g.items.some((i) => i.href === activeHref))?.label ?? null,
    [groups, activeHref],
  );

  const toggle = (label: string) => setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className="scroll-invisible flex-1 space-y-4 overflow-y-auto" aria-label="Navegação do painel">
      {groups.map((group, groupIndex) => {
        // padrão: apenas a primeira seção (GERAL) e a seção da página ativa ficam abertas
        const defaultOpen = groupIndex === 0 || group.label === activeGroup;
        const isCollapsed = collapsed[group.label] ?? !defaultOpen;
        return (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              aria-expanded={!isCollapsed}
              className="group flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/5"
              title={isCollapsed ? "Expandir seção" : "Recolher seção"}
            >
              {group.icon && <span className="shrink-0 text-[#8b7cf6]">{group.icon}</span>}
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a5b4fc]">
                {group.label}
              </span>
              <span className="h-px flex-1 bg-white/10" aria-hidden />
              <ChevronDown
                size={14}
                className={`shrink-0 text-white/35 transition-transform duration-200 ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
                aria-hidden
              />
            </button>

            {!isCollapsed && (
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`group flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200 ${
                          active
                            ? "bg-brand-gradient text-white shadow-[0_6px_18px_rgba(109,74,255,0.35)]"
                            : "text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span
                          className={`shrink-0 transition-colors ${
                            active ? "text-white" : "text-white/60 group-hover:text-[#a5b4fc]"
                          }`}
                        >
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
