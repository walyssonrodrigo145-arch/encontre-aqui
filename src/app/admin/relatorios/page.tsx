import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  boosts,
  customers,
  payments,
  providers,
  quotes,
  subscriptions,
  users,
} from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { SectionTitle } from "@/components/ui";
import { AdminPageHeader, AdminStat } from "@/components/admin-ui";

export const metadata = { title: "Admin — Relatórios" };

export default async function AdminRelatoriosPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totals,
    newThisMonth,
    activeSubs,
    revenueAll,
    revenueMonth,
    boostRevenue,
    quotesMonth,
    apptsTotal,
    apptsCompleted,
    cancelRate,
    topCategories,
    topProviders,
  ] = await Promise.all([
    db
      .select({
        customers: sql<number>`sum(case when ${users.role} = 'CUSTOMER' then 1 else 0 end)`,
        providers: sql<number>`sum(case when ${users.role} = 'PROVIDER' then 1 else 0 end)`,
      })
      .from(users)
      .where(eq(users.status, "ACTIVE")),
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, monthStart)),
    db
      .select({ c: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "ACTIVE")),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` })
      .from(payments)
      .where(eq(payments.status, "CONFIRMED")),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` })
      .from(payments)
      .where(and(eq(payments.status, "CONFIRMED"), gte(payments.createdAt, monthStart))),
    db
      .select({ total: sql<number>`coalesce(sum(${boosts.priceCents}),0)` })
      .from(boosts)
      .where(sql`${boosts.status} in ('ACTIVE','EXPIRED')`),
    db.select({ c: sql<number>`count(*)` }).from(quotes).where(gte(quotes.createdAt, monthStart)),
    db.select({ c: sql<number>`count(*)` }).from(appointments),
    db.select({ c: sql<number>`count(*)` }).from(appointments).where(eq(appointments.status, "COMPLETED")),
    db
      .select({
        total: sql<number>`count(*)`,
        cancelled: sql<number>`sum(case when ${appointments.status} = 'CANCELLED' then 1 else 0 end)`,
      })
      .from(appointments),
    db
      .select({ name: customers.city, c: sql<number>`count(*)` })
      .from(customers)
      .groupBy(customers.city)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db
      .select({
        name: providers.displayName,
        completed: providers.completedJobs,
        rating: providers.ratingAvg,
      })
      .from(providers)
      .where(eq(providers.status, "APPROVED"))
      .orderBy(sql`${providers.completedJobs} desc`)
      .limit(5),
  ]);

  const cancelPct =
    cancelRate[0]!.total > 0 ? Math.round((Number(cancelRate[0]!.cancelled ?? 0) / Number(cancelRate[0]!.total)) * 100) : 0;

  const highlights: [string, string, string, string][] = [
    ["Clientes ativos", String(totals[0]!.customers ?? 0), `+${newThisMonth[0]!.c} novos no mês`, "bg-emerald-50 text-emerald-600"],
    ["Assinaturas ativas", String(activeSubs[0]!.c), "MRR em evolução", "bg-sky-50 text-sky-600"],
    ["Receita de impulsões", formatMoney(boostRevenue[0]!.total), "todas as campanhas", "bg-amber-50 text-amber-600"],
    ["Taxa de cancelamento", `${cancelPct}%`, "de todos os agendamentos", "bg-red-50 text-red-500"],
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Relatórios" subtitle="Indicadores da plataforma — atualizado agora" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {highlights.map(([label, value, sub, tile]) => (
          <AdminStat key={label} label={label} value={value} sub={sub} icon={<span className="text-sm font-bold">•</span>} tile={tile} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Prestadores ativos", String(totals[0]!.providers ?? 0)],
          ["Receita total", formatMoney(revenueAll[0]!.total)],
          [`Solicitações (mês)`, String(quotesMonth[0]!.c)],
          ["Agendamentos totais", `${String(apptsTotal[0]!.c)} (${apptsCompleted[0]!.c} concluídos)`],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-display mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-center text-[11px] text-slate-400">
        Receita deste mês: {formatMoney(revenueMonth[0]!.total)}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle>Prestadores com mais serviços</SectionTitle>
          <ul className="space-y-2">
            {topProviders.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {i + 1}. {p.name}
                </span>
                <span className="font-semibold text-slate-700">
                  {p.completed} serviços · ⭐ {p.rating.toFixed(1).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <SectionTitle>Cidades com mais clientes</SectionTitle>
          <ul className="space-y-2">
            {topCategories.map((c) => (
              <li key={c.name ?? "—"} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.name ?? "Sem cidade"}</span>
                <span className="font-semibold text-slate-700">{c.c} cliente(s)</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-center text-xs text-slate-400">
        Gerado em {formatDate(now)} · dados consolidados em tempo real
      </p>
    </div>
  );
}
