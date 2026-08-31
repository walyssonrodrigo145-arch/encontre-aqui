import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/ui";
import { AdminPageHeader, AdminStat, FilterChip, withParam } from "@/components/admin-ui";

export const metadata = { title: "Admin — Assinaturas" };

const STATUSES = ["ACTIVE", "PAST_DUE", "CANCELED", "PENDING_PAYMENT"] as const;

export default async function AdminAssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : undefined;

  const rows = await db
    .select({
      sub: subscriptions,
      providerName: providers.displayName,
      providerId: providers.id,
      planName: subscriptionPlans.name,
      priceCents: subscriptionPlans.priceCents,
    })
    .from(subscriptions)
    .innerJoin(providers, eq(subscriptions.providerId, providers.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(200);

  const visible = status ? rows.filter((r) => r.sub.status === status) : rows;
  const active = rows.filter((r) => r.sub.status === "ACTIVE");
  const pastDue = rows.filter((r) => r.sub.status === "PAST_DUE");
  const canceled = rows.filter((r) => r.sub.status === "CANCELED");
  const mrr = active.reduce((acc, r) => acc + r.priceCents, 0);

  const chip = (value: string | undefined, label: string) => (
    <FilterChip
      label={label}
      active={!status ? value === undefined : status === value}
      href={`/admin/assinaturas${withParam({ status }, "status", value)}`}
    />
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Assinaturas" subtitle="Receita recorrente da plataforma" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Ativas" value={active.length} icon={<span className="text-sm font-bold">✓</span>} tile="bg-emerald-50 text-emerald-600" sub="pagando agora" />
        <AdminStat label="MRR" value={formatMoney(mrr)} icon={<span className="text-sm font-bold">R$</span>} tile="bg-sky-50 text-sky-600" sub="receita mensal recorrente" />
        <AdminStat label="Inadimplentes" value={pastDue.length} icon={<span className="text-sm font-bold">!</span>} tile="bg-amber-50 text-amber-600" sub="vencidas" />
        <AdminStat label="Canceladas" value={canceled.length} icon={<span className="text-sm font-bold">✕</span>} tile="bg-red-50 text-red-500" sub="histórico" />
      </div>

      <div className="flex flex-wrap gap-2">
        {chip(undefined, "Todos")}
        {chip("ACTIVE", "Ativas")}
        {chip("PAST_DUE", "Inadimplentes")}
        {chip("CANCELED", "Canceladas")}
        {chip("PENDING_PAYMENT", "Pendentes")}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<span>💳</span>} title="Nenhuma assinatura registrada" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="p-3">Prestador</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Renova</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.sub.id} className="border-b border-slate-50 transition hover:bg-slate-50/60 last:border-0">
                  <td className="p-3 font-semibold text-slate-700">{r.providerName}</td>
                  <td className="p-3">{r.planName}</td>
                  <td className="p-3">{formatMoney(r.priceCents)}</td>
                  <td className="p-3 text-xs text-slate-400">{formatDate(r.sub.currentPeriodEnd, false)}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={r.sub.status}
                      label={
                        r.sub.status === "ACTIVE"
                          ? "Ativa"
                          : r.sub.status === "PAST_DUE"
                            ? "Inadimplente"
                            : r.sub.status === "CANCELED"
                              ? "Cancelada"
                              : "Pendente"
                      }
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
