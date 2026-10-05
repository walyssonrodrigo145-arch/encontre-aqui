"use client";

import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "./ui";
import { logoutAction } from "@/server/actions/auth";

/**
 * Card do usuário no rodapé da sidebar.
 * O chevron expande e revela o botão "Sair".
 */
export function SidebarUser({ userName, userSubtitle }: { userName: string; userSubtitle: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10">
      <div className="flex items-center gap-3">
        <Avatar name={userName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{userName}</p>
          <p className="truncate text-xs text-white/50">{userSubtitle}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Esconder opções da conta" : "Mostrar opções da conta"}
          title={open ? "Esconder opções" : "Opções da conta"}
          className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <form action={logoutAction} className="mt-2.5 border-t border-white/10 pt-2.5">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20">
            <LogOut size={14} /> Sair da conta
          </button>
        </form>
      )}
    </div>
  );
}
