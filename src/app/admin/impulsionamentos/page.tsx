import { desc, eq } from "drizzle-orm";
import { AlertCircle, Clock, Rocket } from "lucide-react";
import { db } from "@/lib/db";
import { boosts, providers } from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/ui";
import { AdminPageHeader, AdminStat, FilterChip, withParam } from "@/components/admin-ui";

export const metadata = { title: "Admin — Impulsionamentos" };

const STATUSES = ["ACTIVE", "PENDING_PAYMENT", "EXPIRED", "CANCELLED"] as const;

/** Limite para o card "expirando em 7 dias" (fora do escopo de render). */
function expiringCutoff(): number {
  return Date.now() + 7 * 24 * 3600_000;
}

export default async function AdminBoostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;

  const rows = await db
    .select({
      boost: boosts,
      providerName: providers.displayName,
    })
    .from(boosts)
    .innerJoin(providers, eq(boosts.providerId, providers.id))
    .orderBy(desc(boosts.createdAt))
    .limit(200);

  const visible = status ? rows.filter((r) => r.boost.status === status) : rows;
  const active = rows.filter((r) => r.boost.status === "ACTIVE");
  const paid = rows.filter((r) => r.boost.status !== "PENDING_PAYMENT");
  const revenue = paid.reduce((a, r) => a + r.boost.priceCents, 0);
  const in7d = expiringCutoff();
  const expiring = active.filter((r) => r.boost.endsAt.getTime() <= in7d).length;

  const chip = (value: string | undefined, label: string) => (
    <FilterChip
      label={label}
      active={!status ? value === undefined : status === value}
      href={`/admin/impulsionamentos${withParam({ status }, "status", value)}`}
    />
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Impulsionamentos" subtitle="Campanhas de destaque dos prestadores" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Ativos" value={active.length} icon={<Rocket size={18} />} tile="bg-emerald-50 text-emerald-600" sub="no ar agora" />
        <AdminStat label="Receita total" value={formatMoney(revenue)} icon={<span className="text-sm font-bold">R$</span>} tile="bg-sky-50 text-sky-600" sub="boosts pagos" />
        <AdminStat label="Expirando em 7d" value={expiring} icon={<Clock size={18} />} tile="bg-amber-50 text-amber-600" sub="renovar/avisar" />
        <AdminStat label="Pendentes" value={rows.filter((r) => r.boost.status === "PENDING_PAYMENT").length} icon={<AlertCircle size={18} />} tile="bg-red-50 text-red-500" sub="aguardando pagamento" />
      </div>

      <div className="flex flex-wrap gap-2">
        {chip(undefined, "Todos")}
        {chip("ACTIVE", "Ativos")}
        {chip("PENDING_PAYMENT", "Pendentes")}
        {chip("EXPIRED", "Expirados")}
        {chip("CANCELLED", "Cancelados")}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Rocket size={20} />} title="Nenhum impulsionamento encontrado" description="Ajuste o filtro de status." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="p-3">Prestador</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Período</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.boost.id} className="border-b border-slate-50 transition hover:bg-slate-50/60 last:border-0">
                  <td className="p-3 font-semibold text-slate-700">{r.providerName}</td>
                  <td className="p-3">
                    {r.boost.type === "FEATURED" ? "⭐ Destaque" : r.boost.type === "REGIONAL" ? "📍 Regional" : "🚀 Básico"}
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {formatDate(r.boost.startsAt, false)} → {formatDate(r.boost.endsAt, false)}
                  </td>
                  <td className="p-3">{formatMoney(r.boost.priceCents)}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={r.boost.status}
                      label={r.boost.status === "ACTIVE" ? "Ativo" : r.boost.status === "EXPIRED" ? "Expirado" : r.boost.status === "CANCELLED" ? "Cancelado" : "Pendente"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
