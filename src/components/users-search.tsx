"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "", label: "Todos" },
  { value: "CUSTOMER", label: "Clientes" },
  { value: "PROVIDER", label: "Prestadores" },
  { value: "ADMIN", label: "Admins" },
];

export function UsersSearch({ defaultQ }: { defaultQ: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(defaultQ);
  const role = sp.get("role") ?? "";

  const push = (patch: { q?: string; role?: string }) => {
    const params = new URLSearchParams(sp.toString());
    if (patch.q != null) {
      if (patch.q) params.set("q", patch.q);
      else params.delete("q");
    }
    if (patch.role != null) {
      if (patch.role) params.set("role", patch.role);
      else params.delete("role");
    }
    router.push(`/admin/usuarios?${params.toString()}`);
  };

  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q });
        }}
        className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3"
      >
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
        />
      </form>
      <div className="flex gap-1.5">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => push({ role: r.value })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              role === r.value
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-white text-slate-500 hover:border-[var(--primary)]/40",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
