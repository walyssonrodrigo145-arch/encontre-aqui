import { and, desc, eq, gt, gte } from "drizzle-orm";
import { Eye, MousePointerClick, Rocket } from "lucide-react";
import { db } from "@/lib/db";
import { boosts, providerStats, providers } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";
import { BoostForm } from "@/components/monetization-forms";
import { SectionTitle, StatCard, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Impulsionar perfil" };

export default async function ImpulsionarPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [activeBoosts, history, statsRows] = await Promise.all([
    db
      .select()
      .from(boosts)
      .where(and(eq(boosts.providerId, provider.id), eq(boosts.status, "ACTIVE"), gt(boosts.endsAt, now)))
      .orderBy(desc(boosts.endsAt)),
    db
      .select()
      .from(boosts)
      .where(eq(boosts.providerId, provider.id))
      .orderBy(desc(boosts.createdAt))
      .limit(10),
    db
      .select({
        views: providerStats.profileViews,
        clicks: providerStats.contactClicks,
      })
      .from(providerStats)
      .where(and(eq(providerStats.providerId, provider.id), gte(providerStats.date, weekStart.toISOString().slice(0, 10)))),
  ]);

  const views7d = statsRows.reduce((a, r) => a + Number(r.views), 0);
  const clicks7d = statsRows.reduce((a, r) => a + Number(r.clicks), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">🚀 Impulsione seu perfil</h1>
        <p className="text-sm text-slate-500">Apareça para mais clientes na sua região</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Visualizações (7d)" value={views7d} icon={<Eye size={18} />} accent="bg-purple-100 text-purple-700" />
        <StatCard label="Cliques no contato (7d)" value={clicks7d} icon={<MousePointerClick size={18} />} accent="bg-blue-100 text-blue-700" />
        <StatCard label="Serviços concluídos" value={provider.completedJobs} icon={<Rocket size={18} />} />
        <StatCard
          label="Impulsões ativos"
          value={activeBoosts.length}
          icon={<Rocket size={18} />}
          accent="bg-amber-100 text-amber-700"
        />
      </div>

      {activeBoosts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">✨ Você tem impulsionamento ativo!</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {activeBoosts.map((b) => (
              <li key={b.id}>
                {b.type === "FEATURED" ? "⭐ Destaque" : b.type === "REGIONAL" ? "📍 Regional" : "🚀 Básico"} até{" "}
                {formatDate(b.endsAt, false)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <BoostForm />

      {history.length > 0 && (
        <section>
          <SectionTitle>Histórico de impulsionamentos</SectionTitle>
          <ul className="card divide-y divide-slate-100">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {b.type === "FEATURED" ? "⭐ Destaque" : b.type === "REGIONAL" ? "📍 Regional" : "🚀 Básico"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(b.startsAt, false)} → {formatDate(b.endsAt, false)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">{formatMoney(b.priceCents)}</span>
                  <StatusBadge
                    status={b.status}
                    label={b.status === "ACTIVE" ? "Ativo" : b.status === "EXPIRED" ? "Expirado" : b.status === "CANCELLED" ? "Cancelado" : "Pendente"}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
