import Link from "next/link";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Star,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  providerStats,
  providers,
  quoteResponses,
  quotes,
  users,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { APPOINTMENT_STATUS_LABEL, formatDate, initials } from "@/lib/utils";
import { brtDateString } from "@/lib/tz";
import { EmptyState, StatusBadge } from "@/components/ui";
import { LineChart, BarChart, ChartCard } from "@/components/charts";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Dashboard do prestador" };
export const dynamic = "force-dynamic";

function last7Days() {
  const days: { label: string; start: Date; end: Date; dateStr: string }[] = [];
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    // início do dia em horário de Brasília (determinístico independente do TZ do servidor)
    const dateStr = brtDateString(new Date(now - i * 24 * 60 * 60 * 1000));
    const start = new Date(`${dateStr}T00:00:00-03:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    days.push({
      label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      start,
      end,
      dateStr,
    });
  }
  return days;
}

export default async function ProviderDashboardPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const days = last7Days();
  const weekStart = days[0]!.start;
  const weekStartStr = days[0]!.dateStr;
  const lastWeekStartStr = brtDateString(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
  const todayStartStr = days[days.length - 1]!.dateStr;

  const [
    openQuotes,
    quotesSent,
    viewsWeek,
    viewsLastWeek,
    nextAppointments,
    statsRows,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)` })
      .from(quotes)
      .where(and(eq(quotes.providerId, provider.id), eq(quotes.status, "OPEN"))),
    db
      .select({ c: sql<number>`count(*)` })
      .from(quoteResponses)
      .where(eq(quoteResponses.providerId, provider.id)),
    db
      .select({ v: sql<number>`coalesce(sum(${providerStats.profileViews}),0)` })
      .from(providerStats)
      .where(and(eq(providerStats.providerId, provider.id), gte(providerStats.date, weekStartStr))),
    db
      .select({ v: sql<number>`coalesce(sum(${providerStats.profileViews}),0)` })
      .from(providerStats)
      .where(
        and(
          eq(providerStats.providerId, provider.id),
          gte(providerStats.date, lastWeekStartStr),
          // limite superior: comparar semana COM semana (antes somava 14 dias)
          sql`${providerStats.date} < ${weekStartStr}`,
        ),
      ),
    db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        customerName: users.name,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .where(
        and(
          eq(appointments.providerId, provider.id),
          ne(appointments.status, "CANCELLED"),
          gte(appointments.scheduledAt, new Date(`${todayStartStr}T00:00:00-03:00`)),
        ),
      )
      .orderBy(appointments.scheduledAt)
      .limit(4),
    db
      .select({ date: providerStats.date, views: providerStats.profileViews })
      .from(providerStats)
      .where(and(eq(providerStats.providerId, provider.id), gte(providerStats.date, weekStartStr))),
  ]);

  // séries simples: solicitações e agendamentos por dia (7 dias)
  const quotesAll = await db
    .select({ createdAt: quotes.createdAt })
    .from(quotes)
    .where(and(eq(quotes.providerId, provider.id), gte(quotes.createdAt, weekStart)));
  const apptsAll = await db
    .select({ createdAt: appointments.createdAt })
    .from(appointments)
    .where(and(eq(appointments.providerId, provider.id), gte(appointments.createdAt, weekStart)));

  const seriesLabels = days.map((d) => d.label);
  const quotesSeries = days.map((d) =>
    quotesAll.filter((q) => q.createdAt >= d.start && q.createdAt < d.end).length,
  );
  const apptsSeries = days.map((d) =>
    apptsAll.filter((a) => a.createdAt >= d.start && a.createdAt < d.end).length,
  );

  const viewsW = Number(viewsWeek[0]!.v);
  const viewsLW = Number(viewsLastWeek[0]!.v);
  const viewsDelta = viewsLW > 0 ? Math.round(((viewsW - viewsLW) / viewsLW) * 100) : viewsW > 0 ? 100 : 0;
  const viewsByDate = new Map(statsRows.map((r) => [r.date, Number(r.views)]));
  const viewsSeries = days.map((d) => viewsByDate.get(d.dateStr) ?? 0);

  const stats = [
    {
      label: "Solicitações",
      value: openQuotes[0]!.c,
      delta: null as string | null,
      icon: <ClipboardList size={17} />,
      color: "bg-[var(--primary-soft)] text-[var(--primary)]",
    },
    {
      label: "Orçamentos enviados",
      value: quotesSent[0]!.c,
      delta: null,
      icon: <FileText size={17} />,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Serviços concluídos",
      value: provider.completedJobs,
      delta: null,
      icon: <CalendarDays size={17} />,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Avaliação média",
      value: provider.ratingAvg.toFixed(1).replace(".", ","),
      delta: `${provider.ratingCount} avaliações`,
      icon: <Star size={17} />,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  const responsePct = Math.round(provider.responseRate * 100);

  return (
    <div className="space-y-5">
      {provider.status === "PENDING" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          ⏳ Seu perfil está em análise. Em breve você aparecerá nas buscas!
        </div>
      )}

      {/* ─── Stat cards ─── */}
      <FadeIn>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="card card-hover p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.color}`}>
                  {s.icon}
                </span>
              </div>
              <p className="font-display mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">{s.value}</p>
              {s.delta && <p className="mt-0.5 text-[11px] font-medium text-slate-400">{s.delta}</p>}
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* ─── Próximos agendamentos ─── */}
        <FadeIn className="xl:col-span-2">
          <div className="card h-full p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-800">Próximos agendamentos</h2>
              <Link href="/prestador/agenda" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                Ver agenda
              </Link>
            </div>
            {nextAppointments.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={20} />}
                title="Nenhum serviço agendado"
                description="Quando clientes agendarem, aparecerá aqui."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {nextAppointments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary-dark)]">
                      {initials(a.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{a.customerName}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(a.scheduledAt)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FadeIn>

        {/* ─── Taxa de resposta ─── */}
        <FadeIn delay={0.08}>
          <div className="card flex h-full flex-col p-5">
            <h2 className="font-display font-bold text-slate-800">Taxa de resposta</h2>
            <p className="font-display mt-2 text-4xl font-extrabold text-slate-900">{responsePct}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all duration-700"
                style={{ width: `${responsePct}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {responsePct >= 80
                ? "Excelente! Responder rápido aumenta suas chances de ser contratado."
                : "Responda rápido às solicitações para ganhar destaque nas buscas."}
            </p>
            <div className="mt-auto pt-4">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] p-3 text-xs text-[var(--primary-dark)]">
                <TrendingUp size={15} className="shrink-0" />
                Perfis com taxa acima de 80% recebem 2x mais solicitações.
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ─── Desempenho (linha) ─── */}
        <FadeIn delay={0.05} className="xl:col-span-2">
          <ChartCard title="Desempenho — solicitações e agendamentos (7 dias)">
            <LineChart data={quotesSeries} labels={seriesLabels} height={170} className="w-full" />
            <div className="mt-2 flex gap-5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> Solicitações (7 dias):{" "}
                <b className="text-slate-700">{quotesSeries.reduce((a, b) => a + b, 0)}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                Agendamentos criados (7 dias):{" "}
                <b className="text-slate-700">{apptsSeries.reduce((a, b) => a + b, 0)}</b>
              </span>
            </div>
          </ChartCard>
        </FadeIn>

        {/* ─── Visualizações (barras) ─── */}
        <FadeIn delay={0.1}>
          <div className="card h-full p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-display font-bold text-slate-800">Visualizações do perfil</h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Eye size={16} />
              </span>
            </div>
            <p className="font-display mt-1 text-3xl font-extrabold text-slate-900">{viewsW}</p>
            <p className={`text-xs font-semibold ${viewsDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {viewsDelta >= 0 ? "+" : ""}
              {viewsDelta}% vs semana anterior
            </p>
            {viewsSeries.some((v) => v > 0) ? (
              <BarChart data={viewsSeries} labels={seriesLabels} height={110} className="mt-3 w-full" />
            ) : (
              <p className="mt-6 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-400">
                Seu perfil ainda não recebeu visualizações nesta semana. Impulsione para aparecer em mais buscas.
              </p>
            )}
            <Link href="/prestador/impulsionar" className="btn-gradient mt-4 w-full text-xs">
              Aumentar visibilidade <ArrowRight size={14} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
