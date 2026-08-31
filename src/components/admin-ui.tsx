import Link from "next/link";
import type { ReactNode } from "react";

/** Cabeçalho padrão das páginas do admin. */
export function AdminPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

/** Card de estatística premium (tile colorido + valor em Outfit). */
export function AdminStat({
  label,
  value,
  sub,
  icon,
  tile = "bg-[var(--primary-soft)] text-[var(--primary)]",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  tile?: string;
  href?: string;
}) {
  const inner = (
    <div className="card h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10">
      <div className="flex items-start justify-between p-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile}`}>{icon}</span>
      </div>
      <p className="font-display -mt-2 px-4 text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="px-4 pb-3 pt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Chip de filtro server-side (link preservando searchParams). */
export function FilterChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
          : "border-[var(--border)] bg-white text-slate-600 hover:border-[var(--primary)]/40"
      }`}
    >
      {label}
    </Link>
  );
}

/** Monta querystring preservando chaves existentes e substituindo uma. */
export function withParam(
  current: Record<string, string | undefined>,
  key: string,
  value: string | undefined,
): string {
  const params = new URLSearchParams();
  const merged = { ...current, [key]: value };
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}
