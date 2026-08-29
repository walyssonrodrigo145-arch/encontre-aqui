import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/ui";

export const metadata = { title: "Admin — Assinaturas" };

export default async function AdminAssinaturasPage() {
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
    .limit(100);

  const active = rows.filter((r) => r.sub.status === "ACTIVE");
  const pastDue = rows.filter((r) => r.sub.status === "PAST_DUE");
  const mrr = active.reduce((acc, r) => acc + r.priceCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Assinaturas</h1>
        <p className="text-sm text-slate-500">
          {active.length} ativas · {pastDue.length} inadimplente(s) · MRR {formatMoney(mrr)}
        </p>
      </div>

      {rows.length === 0 ? (
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
              {rows.map((r) => (
                <tr key={r.sub.id} className="border-b border-slate-50 last:border-0">
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
