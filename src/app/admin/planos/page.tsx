import { asc, eq, sql } from "drizzle-orm";
import { CircleDollarSign, Layers, Rocket, Users } from "lucide-react";
import { db } from "@/lib/db";
import { boosts, providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { formatMoney } from "@/lib/utils";
import { PlansManager } from "@/components/admin-plans-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Planos" };

export default async function AdminPlanosPage() {
  const [plans, counts, activeSubs, revenue, activeBoosts] = await Promise.all([
    db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder)),
    db
      .select({ planId: providers.planId, c: sql<number>`count(*)` })
      .from(providers)
      .where(eq(providers.status, "APPROVED"))
      .groupBy(providers.planId),
    db
      .select({ c: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "ACTIVE")),
    db
      .select({
        total: sql<number>`coalesce(sum(${subscriptionPlans.priceCents}), 0)`,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "ACTIVE")),
    db.select({ c: sql<number>`count(*)` }).from(boosts).where(eq(boosts.status, "ACTIVE")),
  ]);

  const countMap = new Map(counts.map((c) => [c.planId, c.c]));
  const activePlans = plans.filter((p) => p.isActive).length;

  const stats = [
    {
      label: "Planos ativos",
      value: String(activePlans),
      sub: `${plans.length} publicados`,
      icon: <Layers size={20} />,
      tile: "bg-[var(--primary-soft)] text-[var(--primary)]",
    },
    {
      label: "Assinaturas ativas",
      value: String(Number(activeSubs[0]?.c ?? 0)),
      sub: "Prestadores pagantes",
      icon: <Users size={20} />,
      tile: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Receita mensal",
      value: formatMoney(Number(revenue[0]?.total ?? 0)),
      sub: "Total dos planos",
      icon: <CircleDollarSign size={20} />,
      tile: "bg-sky-50 text-sky-600",
    },
    {
      label: "Impulsionamentos",
      value: String(Number(activeBoosts[0]?.c ?? 0)),
      sub: "Boosts ativos",
      icon: <Rocket size={20} />,
      tile: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Planos de assinatura</h1>
        <p className="text-sm text-slate-500">Crie e gerencie os planos disponíveis na plataforma.</p>
      </div>

      {/* ─── Cards de estatísticas (dados reais) ─── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10"
          >
            <div className="flex items-start justify-between p-4">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.tile}`}>
                {s.icon}
              </span>
            </div>
            <p className="font-display -mt-2 px-4 pb-4 text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="-mt-1 px-4 pb-3 text-[11px] text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <PlansManager
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          description: p.description,
          maxPhotos: p.maxPhotos,
          maxPortfolio: p.maxPortfolio,
          searchBoost: p.searchBoost,
          isActive: p.isActive,
          subscribers: countMap.get(p.id) ?? 0,
        }))}
      />
    </div>
  );
}
