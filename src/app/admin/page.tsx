import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { ClipboardList, CreditCard, TrendingUp, Users } from "lucide-react";
import { db } from "@/lib/db";
import {
  appointments,
  boosts,
  payments,
  providers,
  quotes,
  subscriptionPlans,
  subscriptions,
  users,
} from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { LineChart, DonutChart, ChartCard } from "@/components/charts";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Painel administrativo" };
export const dynamic = "force-dynamic";

function last7Days() {
  const days: { label: string; start: Date; end: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    days.push({
      label: `${start.getDate()}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      start,
      end,
    });
  }
  return days;
}

export default async function AdminDashboardPage() {
  const days = last7Days();
  const weekStart = days[0]!.start;
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    activeProviders,
    activeCustomers,
    newProvidersThisWeek,
    newProvidersLastWeek,
    newCustomersThisWeek,
    newCustomersLastWeek,
    quotesWeek,
    quotesMonth,
    apptsMonth,
    revenueAll,
    revenueMonth,
    activeSubs,
    topProviders,
    activeBoostRows,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(providers).where(eq(providers.status, "APPROVED")),
    db.select({ c: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "CUSTOMER"), eq(users.status, "ACTIVE"))),
    db.select({ c: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "PROVIDER"), gte(users.createdAt, weekStart))),
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "PROVIDER"), gte(users.createdAt, lastWeekStart), sql`${users.createdAt} < ${weekStart.getTime()}`)),
    db.select({ c: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "CUSTOMER"), gte(users.createdAt, weekStart))),
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "CUSTOMER"), gte(users.createdAt, lastWeekStart), sql`${users.createdAt} < ${weekStart.getTime()}`)),
    db.select({ createdAt: quotes.createdAt }).from(quotes).where(gte(quotes.createdAt, weekStart)),
    db.select({ c: sql<number>`count(*)` }).from(quotes).where(gte(quotes.createdAt, monthStart)),
    db.select({ c: sql<number>`count(*)` }).from(appointments).where(gte(appointments.createdAt, monthStart)),
    db.select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` }).from(payments).where(eq(payments.status, "CONFIRMED")),
    db.select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` }).from(payments).where(and(eq(payments.status, "CONFIRMED"), gte(payments.createdAt, monthStart))),
    db
      .select({ c: sql<number>`count(*)`, plan: subscriptionPlans.name, color: subscriptionPlans.slug })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "ACTIVE"))
      .groupBy(subscriptionPlans.name, subscriptionPlans.slug),
    db
      .select({
        name: providers.displayName,
        completed: providers.completedJobs,
        rating: providers.ratingAvg,
      })
      .from(providers)
      .where(eq(providers.status, "APPROVED"))
      .orderBy(desc(providers.completedJobs))
      .limit(5),
    db
      .select({
        boost: boosts,
        providerName: providers.displayName,
      })
      .from(boosts)
      .innerJoin(providers, eq(boosts.providerId, providers.id))
      .where(eq(boosts.status, "ACTIVE"))
      .orderBy(desc(boosts.endsAt))
      .limit(6),
  ]);

  const quotesSeries = days.map((d) => quotesWeek.filter((q) => q.createdAt >= d.start && q.createdAt < d.end).length);
  const seriesLabels = days.map((d) => d.label);

  /** % de variação semanal; sem base comparável devolve null */
  const weeklyDelta = (current: number, previous: number): string | null => {
    if (previous > 0) return `${current >= previous ? "+" : ""}${Math.round(((current - previous) / previous) * 100)}% vs semana anterior`;
    if (current > 0) return `${current} novo(s) esta semana`;
    return null;
  };

  const planColors: Record<string, string> = {
    basico: "#a5b4fc",
    profissional: "#5b4fe9",
    premium: "#f59e0b",
  };

  const stats = [
    {
      label: "Prestadores ativos",
      value: Number(activeProviders[0]!.c).toLocaleString("pt-BR"),
      delta: weeklyDelta(Number(newProvidersThisWeek[0]!.c), Number(newProvidersLastWeek[0]!.c)),
      icon: <Users size={16} />,
    },
    {
      label: "Clientes cadastrados",
      value: Number(activeCustomers[0]!.c).toLocaleString("pt-BR"),
      delta: weeklyDelta(Number(newCustomersThisWeek[0]!.c), Number(newCustomersLastWeek[0]!.c)),
      icon: <Users size={16} />,
    },
    {
      label: "Solicitações no mês",
      value: Number(quotesMonth[0]!.c).toLocaleString("pt-BR"),
      delta: `${quotesSeries.reduce((a, b) => a + b, 0)} nos últimos 7 dias`,
      icon: <ClipboardList size={16} />,
    },
    {
      label: "Agendamentos no mês",
      value: Number(apptsMonth[0]!.c).toLocaleString("pt-BR"),
      delta: null as string | null,
      icon: <CreditCard size={16} />,
    },
    {
      label: "Faturamento",
      value: formatMoney(Number(revenueAll[0]!.total)),
      delta: `${formatMoney(Number(revenueMonth[0]!.total))} este mês`,
      icon: <CreditCard size={16} />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards grandes */}
      <FadeIn>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="card card-hover p-4 md:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  {s.icon}
                </span>
              </div>
              <p className="font-display mt-1.5 truncate text-xl font-extrabold text-slate-900 md:text-2xl xl:text-3xl">
                {s.value}
              </p>
              {s.delta && <p className="mt-1 truncate text-[11px] font-semibold text-emerald-600">{s.delta}</p>}
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Solicitações 7 dias */}
        <FadeIn delay={0.05} className="xl:col-span-2">
          <ChartCard title="Solicitações nos últimos 7 dias">
            <LineChart data={quotesSeries} labels={seriesLabels} height={190} className="w-full" />
          </ChartCard>
        </FadeIn>

        {/* Top prestadores */}
        <FadeIn delay={0.1}>
          <div className="card h-full p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800">Prestadores mais solicitados</h2>
              <Link href="/admin/prestadores" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                Ver todos
              </Link>
            </div>
            <ul className="space-y-3">
              {topProviders.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold ${
                      i === 0 ? "bg-brand-gradient text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{p.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    ⭐ {p.rating.toFixed(1).replace(".", ",")} · {p.completed} serviços
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        {/* Assinaturas (donut) */}
        <FadeIn delay={0.05}>
          <ChartCard title="Assinaturas ativas">
            {activeSubs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Nenhuma assinatura ativa ainda.</p>
            ) : (
              <DonutChart
                segments={activeSubs.map((s) => ({
                  label: s.plan,
                  value: Number(s.c),
                  color: planColors[s.color] ?? "#5b4fe9",
                }))}
                centerValue={String(activeSubs.reduce((a, s) => a + Number(s.c), 0))}
                centerLabel="ativas"
              />
            )}
          </ChartCard>
        </FadeIn>

        {/* Impulsionamentos ativos */}
        <FadeIn delay={0.1} className="xl:col-span-2">
          <div className="card h-full p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800">Impulsionamentos ativos</h2>
              <Link href="/admin/impulsionamentos" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                Ver todos
              </Link>
            </div>
            {activeBoostRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhuma campanha ativa no momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-3 font-medium">Prestador</th>
                      <th className="pb-2 pr-3 font-medium">Tipo</th>
                      <th className="pb-2 pr-3 font-medium">Período</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeBoostRows.map(({ boost, providerName }) => (
                      <tr key={boost.id}>
                        <td className="py-2.5 pr-3 font-medium text-slate-700">{providerName}</td>
                        <td className="py-2.5 pr-3 text-slate-500">
                          {boost.type === "FEATURED" ? "Destaque" : boost.type === "REGIONAL" ? "Regional" : "Básico"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-slate-400">
                          {formatDate(boost.startsAt, false)} → {formatDate(boost.endsAt, false)}
                        </td>
                        <td className="py-2.5">
                          <StatusBadge status="ACTIVE" label="Ativo" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] p-3 text-xs text-[var(--primary-dark)]">
              <TrendingUp size={15} className="shrink-0" />
              Impulsionamentos são a segunda fonte de receita da plataforma.
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
