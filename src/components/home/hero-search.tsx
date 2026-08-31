"use client";

import { useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Busca dupla — o elemento central da landing.
 * Formulário GET funcional para /busca?q&onde
 */
export function HeroSearch() {
  const [focused, setFocused] = useState<"q" | "onde" | null>(null);

  return (
    <motion.form
      action="/busca"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mt-9 grid gap-2.5 rounded-2xl border bg-white p-3 transition-all duration-300 sm:grid-cols-[1.15fr_1fr_auto]",
        focused
          ? "border-[var(--primary)]/50 shadow-2xl shadow-[var(--primary)]/15"
          : "border-[var(--border)] shadow-xl shadow-slate-900/[0.06]",
      )}
      aria-label="Buscar profissionais"
    >
      <label
        className={cn(
          "min-w-0 cursor-text rounded-xl px-4 py-3 transition-colors",
          focused === "q" ? "bg-[var(--primary-soft)]" : "bg-slate-50",
        )}
      >
        <span className="flex items-center gap-2.5">
          <Search size={18} className="shrink-0 text-[var(--primary)]" />
          <span className="sr-only">O que você precisa?</span>
          <input
            name="q"
            required
            minLength={2}
            placeholder="O que você precisa?"
            onFocus={() => setFocused("q")}
            onBlur={() => setFocused(null)}
            className="min-w-0 w-full bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500"
          />
        </span>
        <span className="block truncate pl-[26px] pt-1 text-[11px] text-slate-400">
          Ex: eletricista, pintor, fotógrafo...
        </span>
      </label>

      <label
        className={cn(
          "min-w-0 cursor-text rounded-xl px-4 py-3 transition-colors sm:border-l sm:border-slate-100",
          focused === "onde" ? "bg-[var(--primary-soft)]" : "bg-slate-50",
        )}
      >
        <span className="flex items-center gap-2.5">
          <MapPin size={18} className="shrink-0 text-[var(--primary)]" />
          <span className="sr-only">Onde?</span>
          <input
            name="onde"
            placeholder="Onde?"
            onFocus={() => setFocused("onde")}
            onBlur={() => setFocused(null)}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500"
          />
          <Crosshair size={16} className="shrink-0 text-slate-300" />
        </span>
        <span className="block truncate pl-[28px] pt-1 text-[11px] text-slate-400">
          Digite sua cidade ou localização
        </span>
      </label>

      <button
        type="submit"
        className="btn-gradient min-w-0 whitespace-nowrap rounded-xl px-5 text-[15px] font-bold sm:min-w-[180px] sm:self-stretch"
      >
        <Search size={17} className="sm:hidden" />
        <span className="hidden sm:inline">Buscar profissionais</span>
        <span className="sm:hidden">Buscar</span>
      </button>
    </motion.form>
  );
}
