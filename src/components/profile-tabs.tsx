"use client";

import { useState } from "react";

export interface ProfileTab {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

/**
 * Abas do "Meu perfil" em cards grandes. Todas as seções permanecem montadas
 * (escondidas via CSS) para não perder edições não salvas ao alternar.
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm sm:grid-cols-3"
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`flex items-start gap-3 p-4 text-left transition-all duration-200 sm:p-5 ${
                i > 0 ? "border-t border-[var(--border)] sm:border-l sm:border-t-0" : ""
              } ${
                isActive
                  ? "bg-brand-gradient text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                  : "hover:bg-[var(--primary-soft)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? "bg-white/20 text-white" : "bg-[var(--primary-soft)] text-[var(--primary)]"
                }`}
              >
                {tab.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold sm:text-[15px] ${isActive ? "text-white" : "text-slate-800"}`}>
                  {tab.title}
                </span>
                <span className={`mt-0.5 block text-xs leading-snug ${isActive ? "text-white/85" : "text-slate-400"}`}>
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tabs.map((tab) => (
          <div key={tab.id} role="tabpanel" hidden={tab.id !== active}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
