import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans } from "@/lib/schema";
import { formatMoney } from "@/lib/utils";
import { PlanForm } from "@/components/admin-forms";

export const metadata = { title: "Admin — Planos" };

export default async function AdminPlanosPage() {
  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder));
  const counts = await db
    .select({ planId: providers.planId, c: sql<number>`count(*)` })
    .from(providers)
    .where(eq(providers.status, "APPROVED"))
    .groupBy(providers.planId);
  const countMap = new Map(counts.map((c) => [c.planId, c.c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Planos de assinatura</h1>
        <p className="text-sm text-slate-500">Preços e limites aplicados imediatamente</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-bold text-slate-800">{plan.name}</p>
                <p className="text-sm text-[var(--primary)] font-semibold">{formatMoney(plan.priceCents)}/mês</p>
                <p className="text-xs text-slate-400">
                  {countMap.get(plan.id) ?? 0} assinante(s) · boost {Math.round(plan.searchBoost * 100)}% ·{" "}
                  {plan.maxPortfolio} portfólio
                </p>
              </div>
              <div className="w-44">
                <PlanForm
                  plan={{
                    id: plan.id,
                    name: plan.name,
                    priceCents: plan.priceCents,
                    description: plan.description,
                    maxPhotos: plan.maxPhotos,
                    maxPortfolio: plan.maxPortfolio,
                    searchBoost: plan.searchBoost,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Novo plano</h2>
          <PlanForm />
        </div>
      </div>
    </div>
  );
}
