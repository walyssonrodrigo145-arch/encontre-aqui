import Link from "next/link";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, customers, payments, providerFinances, providers, services, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { brtDateString } from "@/lib/tz";
import { FinanceManager } from "@/components/finance-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financeiro" };

/** Agregação fora do escopo de render (impureza de Date.now). */
async function loadFinance(providerId: number) {
  const since90 = new Date(Date.now() - 90 * 24 * 3600_000);

  return Promise.all([
    db
      .select()
      .from(providerFinances)
      .where(eq(providerFinances.providerId, providerId))
      .orderBy(desc(providerFinances.occurredAt), desc(providerFinances.id))
      .limit(200),
    db
      .select({
        id: payments.id,
        description: payments.description,
        amountCents: payments.amountCents,
        paidAt: payments.paidAt,
        subscriptionId: payments.subscriptionId,
      })
      .from(payments)
      .where(and(eq(payments.providerId, providerId), eq(payments.status, "CONFIRMED"), gte(payments.paidAt, since90)))
      .orderBy(desc(payments.paidAt))
      .limit(50),
    db
      .select({
        appointmentId: appointments.id,
        customerName: users.name,
        serviceName: services.name,
        scheduledAt: appointments.scheduledAt,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(providerFinances, eq(providerFinances.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.providerId, providerId),
          eq(appointments.status, "COMPLETED"),
          isNull(providerFinances.id),
        ),
      )
      .orderBy(desc(appointments.scheduledAt))
      .limit(10),
  ]);
}

export default async function ProviderFinancePage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const today = brtDateString(new Date());
  const monthStart = `${today.slice(0, 7)}-01`; // derivado de string, sem chamada impura

  const [entries, platformPayments, pendingAppts] = await loadFinance(provider.id);

  // despesas automáticas da plataforma (assinaturas + impulsões pagos)
  const platformEntries = platformPayments.map((p) => ({
    id: p.id,
    kind: "EXPENSE" as const,
    title: p.description || "Cobrança da plataforma",
    amountCents: p.amountCents,
    occurredAt: brtDateString(p.paidAt ?? new Date()),
    category: "plataforma",
    notes: null,
    source: "PLATFORM" as const,
  }));

  // lançamentos manuais
  const manualEntries = entries.map((e) => ({
    id: e.id,
    kind: e.kind as "INCOME" | "EXPENSE",
    title: e.title,
    amountCents: e.amountCents,
    occurredAt: e.occurredAt,
    category: e.category,
    notes: e.notes,
    source: e.source as "MANUAL" | "PLATFORM",
  }));

  // lista combinada (manual + plataforma), mais recentes primeiro
  const allEntries = [...manualEntries, ...platformEntries].sort((a, b) =>
    a.occurredAt === b.occurredAt ? b.id - a.id : a.occurredAt < b.occurredAt ? 1 : -1,
  );

  // stats do mês corrente (BRT)
  const incomeMonth = manualEntries
    .filter((e) => e.kind === "INCOME" && e.occurredAt >= monthStart)
    .reduce((a, e) => a + e.amountCents, 0);
  const expenseManualMonth = manualEntries
    .filter((e) => e.kind === "EXPENSE" && e.occurredAt >= monthStart)
    .reduce((a, e) => a + e.amountCents, 0);
  const expensePlatformMonth = platformEntries
    .filter((e) => e.occurredAt >= monthStart)
    .reduce((a, e) => a + e.amountCents, 0);
  const expenseMonth = expenseManualMonth + expensePlatformMonth;
  const balance = incomeMonth - expenseMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500">
          Receitas, despesas e o caixa do seu negócio — tudo em um só lugar.
        </p>
      </div>

      {/* ── Stat cards do mês ── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStatLike
          label="Receitas (mês)"
          value={formatMoney(incomeMonth)}
          icon={<ArrowUpCircle size={18} />}
          tile="bg-emerald-50 text-emerald-600"
        />
        <AdminStatLike
          label="Despesas (mês)"
          value={formatMoney(expenseMonth)}
          icon={<ArrowDownCircle size={18} />}
          tile="bg-red-50 text-red-500"
        />
        <AdminStatLike
          label="Saldo do mês"
          value={formatMoney(balance)}
          icon={<Scale size={18} />}
          tile={balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}
        />
        <AdminStatLike
          label="A receber"
          value={String(pendingAppts.length)}
          icon={<Wallet size={18} />}
          tile="bg-amber-50 text-amber-600"
          sub="serviços concluídos sem lançamento"
        />
      </div>

      {/* despesas da plataforma no mês */}
      {expensePlatformMonth > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)]/50 px-5 py-3.5 text-sm">
          <p className="font-medium text-slate-700">
            Despesas com a plataforma neste mês:{" "}
            <b className="text-slate-900">{formatMoney(expensePlatformMonth)}</b>
          </p>
          <Link href="/prestador/assinatura" className="text-xs font-bold text-[var(--primary)] hover:underline">
            Ver assinatura e impulsões
          </Link>
        </div>
      )}

      <FinanceManager
        entries={allEntries}
        pendingAppointments={pendingAppts.map((p) => ({
          appointmentId: p.appointmentId,
          customerName: p.customerName,
          serviceName: p.serviceName,
          completedAt: p.scheduledAt.toISOString(),
        }))}
        today={today}
      />
    </div>
  );
}

/** Stat card local (mesmo visual do AdminStat, sem Link) */
function AdminStatLike({
  label,
  value,
  icon,
  tile,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tile: string;
  sub?: string;
}) {
  return (
    <div className="card h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10">
      <div className="flex items-start justify-between p-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile}`}>{icon}</span>
      </div>
      <p className="font-display -mt-2 px-4 text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="px-4 pb-3 pt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
