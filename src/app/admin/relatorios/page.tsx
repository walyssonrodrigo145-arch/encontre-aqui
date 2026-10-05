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
import { ReportsBoard } from "@/components/reports-board";
import { brtDateString } from "@/lib/tz";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Relatórios" };

/** Agregação fora do escopo de render (impureza de Date.now). */
async function loadReports() {
  const now = Date.now();
  const since14 = new Date(now - 14 * 24 * 3600_000);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    totals,
    activeSubs,
    usersNew14,
    quotes14,
    appts14,
    cancels14,
    subs14,
    boosts14,
    payments14,
    revenueMonth,
    apptsTotal,
    apptsCompleted,
    topProviders,
    topCities,
  ] = await Promise.all([
    db
      .select({
        customers: sql<number>`sum(case when ${users.role} = 'CUSTOMER' and ${users.status} = 'ACTIVE' then 1 else 0 end)`,
        providers: sql<number>`sum(case when ${users.role} = 'PROVIDER' and ${users.status} = 'ACTIVE' then 1 else 0 end)`,
      })
      .from(users)
      .where(eq(users.status, "ACTIVE")),
    db.select({ c: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE")),
    db
      .select({ createdAt: users.createdAt, role: users.role })
      .from(users)
      .where(and(gte(users.createdAt, since14), eq(users.status, "ACTIVE"))),
    db.select({ createdAt: quotes.createdAt }).from(quotes).where(gte(quotes.createdAt, since14)),
    db
      .select({ createdAt: appointments.createdAt, status: appointments.status })
      .from(appointments)
      .where(gte(appointments.createdAt, since14)),
    db
      .select({ updatedAt: appointments.updatedAt })
      .from(appointments)
      .where(and(eq(appointments.status, "CANCELLED"), gte(appointments.updatedAt, since14))),
    db.select({ createdAt: subscriptions.createdAt }).from(subscriptions).where(gte(subscriptions.createdAt, since14)),
    db
      .select({ createdAt: boosts.createdAt, priceCents: boosts.priceCents })
      .from(boosts)
      .where(gte(boosts.createdAt, since14)),
    db
      .select({ createdAt: payments.createdAt, amountCents: payments.amountCents })
      .from(payments)
      .where(and(eq(payments.status, "CONFIRMED"), gte(payments.createdAt, since14))),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` })
      .from(payments)
      .where(and(eq(payments.status, "CONFIRMED"), gte(payments.createdAt, monthStart))),
    db.select({ c: sql<number>`count(*)` }).from(appointments),
    db.select({ c: sql<number>`count(*)` }).from(appointments).where(eq(appointments.status, "COMPLETED")),
    db
      .select({ name: providers.displayName, completed: providers.completedJobs, rating: providers.ratingAvg })
      .from(providers)
      .where(eq(providers.status, "APPROVED"))
      .orderBy(sql`${providers.completedJobs} desc`)
      .limit(5),
    db
      .select({ name: customers.city, c: sql<number>`count(*)` })
      .from(customers)
      .groupBy(customers.city)
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ]);

  // séries diárias (14 buckets, fuso BRT)
  const empty14 = () => Array.from({ length: 14 }, () => 0);
  const series = {
    clientesNovos: empty14(),
    prestadoresNovos: empty14(),
    assinaturasNovas: empty14(),
    receitaPagamentos: empty14(),
    receitaImpulsoes: empty14(),
    solicitacoes: empty14(),
    agendamentos: empty14(),
    cancelamentos: empty14(),
  };
  const dayIndex = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    dayIndex.set(brtDateString(new Date(now - (13 - i) * 24 * 3600_000)), i);
  }
  const bucket = (date: Date) => dayIndex.get(brtDateString(date)) ?? -1;

  for (const u of usersNew14) {
    const i = bucket(u.createdAt);
    if (i < 0) continue;
    if (u.role === "CUSTOMER") series.clientesNovos[i]!++;
    if (u.role === "PROVIDER") series.prestadoresNovos[i]!++;
  }
  for (const q of quotes14) {
    const i = bucket(q.createdAt);
    if (i >= 0) series.solicitacoes[i]!++;
  }
  for (const a of appts14) {
    const i = bucket(a.createdAt);
    if (i >= 0) series.agendamentos[i]!++;
  }
  for (const c of cancels14) {
    const i = bucket(c.updatedAt);
    if (i >= 0) series.cancelamentos[i]!++;
  }
  for (const s of subs14) {
    const i = bucket(s.createdAt);
    if (i >= 0) series.assinaturasNovas[i]!++;
  }
  for (const b of boosts14) {
    const i = bucket(b.createdAt);
    if (i >= 0) series.receitaImpulsoes[i]! += b.priceCents;
  }
  for (const p of payments14) {
    const i = bucket(p.createdAt);
    if (i >= 0) series.receitaPagamentos[i]! += p.amountCents;
  }

  const days = Array.from({ length: 14 }, (_, i) =>
    brtDateString(new Date(now - (13 - i) * 24 * 3600_000)).slice(8) + "/" + brtDateString(new Date(now - (13 - i) * 24 * 3600_000)).slice(5, 7),
  );

  const monthStartStr = `${brtDateString(monthStart).slice(8)}/${brtDateString(monthStart).slice(5, 7)}/${brtDateString(monthStart).slice(0, 4)}`;
  const todayStr = brtDateString(new Date());
  const todayFmt = `${todayStr.slice(8)}/${todayStr.slice(5, 7)}/${todayStr.slice(0, 4)}`;

  return {
    monthRange: `${monthStartStr} - ${todayFmt}`,
    generatedAt: `${todayFmt}, ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    days,
    series,
    totais: {
      clientesAtivos: Number(totals[0]?.customers ?? 0),
      prestadoresAtivos: Number(totals[0]?.providers ?? 0),
      assinaturasAtivas: Number(activeSubs[0]?.c ?? 0),
      agendamentosGeral: Number(apptsTotal[0]?.c ?? 0),
      agendamentosConcluidos: Number(apptsCompleted[0]?.c ?? 0),
      receitaMes: Number(revenueMonth[0]?.total ?? 0),
      solicitacoesMes: 0,
      cancelPct: 0,
    },
    topProviders: topProviders.map((p) => ({ name: p.name, completed: p.completed, rating: p.rating })),
    cities: topCities.map((c) => ({ name: c.name, c: Number(c.c) })),
  };
}

export default async function AdminRelatoriosPage() {
  const data = await loadReports();

  return (
    <ReportsBoard
      title="Relatórios"
      subtitle="Acompanhe o desempenho da plataforma com indicadores atualizados em tempo real."
      monthRange={data.monthRange}
      generatedAt={data.generatedAt}
      days={data.days}
      series={data.series}
      totais={data.totais}
      topProviders={data.topProviders}
      cities={data.cities}
    />
  );
}
