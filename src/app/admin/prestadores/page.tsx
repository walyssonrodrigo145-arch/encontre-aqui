import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans, users } from "@/lib/schema";
import { formatDate, formatPhone } from "@/lib/utils";
import { Avatar, EmptyState, StatusBadge, VerifiedBadge } from "@/components/ui";
import { AdminProviderActions } from "@/components/admin-actions";

export const metadata = { title: "Admin — Prestadores" };

export default async function AdminProvidersPage() {
  const rows = await db
    .select({
      provider: providers,
      userName: users.name,
      email: users.email,
      phone: users.phone,
      planName: subscriptionPlans.name,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .leftJoin(subscriptionPlans, eq(providers.planId, subscriptionPlans.id))
    .orderBy(desc(providers.createdAt));

  const pending = rows.filter((r) => r.provider.status === "PENDING");
  const others = rows.filter((r) => r.provider.status !== "PENDING");

  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <Avatar name={r.provider.displayName} size={44} className="rounded-2xl" />
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/p/${r.provider.slug}`} className="font-bold text-slate-800 hover:text-[var(--primary)]">
                {r.provider.displayName}
              </Link>
              <VerifiedBadge level={r.provider.verificationLevel} />
            </div>
            <p className="text-xs text-slate-400">
              {r.email} · {formatPhone(r.phone)} · {r.provider.city ?? "—"}/{r.provider.state ?? "—"}
            </p>
            <p className="text-xs text-slate-400">
              ⭐ {r.provider.ratingAvg.toFixed(1).replace(".", ",")} ({r.provider.ratingCount}) ·{" "}
              {r.provider.completedJobs} serviços · Plano: {r.planName ?? "—"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge
            status={r.provider.status}
            label={
              r.provider.status === "APPROVED"
                ? "Aprovado"
                : r.provider.status === "PENDING"
                  ? "Em análise"
                  : r.provider.status === "SUSPENDED"
                    ? "Suspenso"
                    : r.provider.status === "REJECTED"
                      ? "Recusado"
                      : "Rascunho"
            }
          />
          <p className="mt-1 text-xs text-slate-400">{formatDate(r.provider.createdAt, false)}</p>
        </div>
      </div>
      {r.provider.status !== "DRAFT" && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <AdminProviderActions
            providerId={r.provider.id}
            status={r.provider.status}
            verificationLevel={r.provider.verificationLevel}
            providerName={r.provider.displayName}
          />
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Prestadores</h1>
        <p className="text-sm text-slate-500">{rows.length} cadastrados</p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-600">
            ⏳ Aguardando aprovação ({pending.length})
          </h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <Row key={r.provider.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Todos</h2>
        {others.length === 0 ? (
          <EmptyState icon={<span>👷</span>} title="Nenhum prestador cadastrado" />
        ) : (
          <ul className="space-y-3">
            {others.map((r) => (
              <Row key={r.provider.id} r={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
