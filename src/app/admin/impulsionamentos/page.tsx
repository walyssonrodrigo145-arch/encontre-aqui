import { desc, eq } from "drizzle-orm";
import { Rocket } from "lucide-react";
import { db } from "@/lib/db";
import { boosts, providers } from "@/lib/schema";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/ui";

export const metadata = { title: "Admin — Impulsionamentos" };

export default async function AdminBoostsPage() {
  const rows = await db
    .select({
      boost: boosts,
      providerName: providers.displayName,
    })
    .from(boosts)
    .innerJoin(providers, eq(boosts.providerId, providers.id))
    .orderBy(desc(boosts.createdAt))
    .limit(100);

  const revenue = rows.filter((r) => r.boost.status !== "PENDING_PAYMENT").reduce((a, r) => a + r.boost.priceCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Impulsionamentos</h1>
        <p className="text-sm text-slate-500">
          {rows.length} campanhas · receita total {formatMoney(revenue)}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Rocket size={20} />} title="Nenhum impulsionamento ainda" />
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
              {rows.map((r) => (
                <tr key={r.boost.id} className="border-b border-slate-50 last:border-0">
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
