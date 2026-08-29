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
        "mt-8 grid gap-2 rounded-2xl border bg-white p-2.5 transition-all duration-300 sm:grid-cols-[1fr_1fr_auto]",
        focused
          ? "border-[var(--primary)]/50 shadow-2xl shadow-[var(--primary)]/15"
          : "border-[var(--border)] shadow-xl shadow-slate-900/[0.06]",
      )}
      aria-label="Buscar profissionais"
    >
      <label
        className={cn(
          "cursor-text rounded-xl px-3.5 py-2 transition-colors",
          focused === "q" ? "bg-[var(--primary-soft)]" : "bg-slate-50",
        )}
      >
        <span className="flex items-center gap-2">
          <Search size={17} className="shrink-0 text-[var(--primary)]" />
          <span className="sr-only">O que você precisa?</span>
          <input
            name="q"
            required
            minLength={2}
            placeholder="O que você precisa?"
            onFocus={() => setFocused("q")}
            onBlur={() => setFocused(null)}
            className="w-full bg-transparent py-1.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500"
          />
        </span>
        <span className="block pl-6 pt-0.5 text-[11px] text-slate-400">
          Ex: eletricista, pintor, fotógrafo...
        </span>
      </label>

      <label
        className={cn(
          "cursor-text rounded-xl px-3.5 py-2 transition-colors sm:border-l sm:border-slate-100",
          focused === "onde" ? "bg-[var(--primary-soft)]" : "bg-slate-50",
        )}
      >
        <span className="flex items-center gap-2">
          <MapPin size={17} className="shrink-0 text-[var(--primary)]" />
          <span className="sr-only">Onde?</span>
          <input
            name="onde"
            placeholder="Onde?"
            onFocus={() => setFocused("onde")}
            onBlur={() => setFocused(null)}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500"
          />
          <Crosshair size={15} className="shrink-0 text-slate-300" />
        </span>
        <span className="block pl-6 pt-0.5 text-[11px] text-slate-400">
          Digite sua cidade ou localização
        </span>
      </label>

      <button
        type="submit"
        className="btn-gradient whitespace-nowrap px-6 text-sm font-bold sm:self-stretch"
      >
        <Search size={16} className="sm:hidden" />
        <span className="hidden sm:inline">Buscar profissionais</span>
        <span className="sm:hidden">Buscar</span>
      </button>
    </motion.form>
  );
}
