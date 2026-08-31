import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans, users } from "@/lib/schema";
import { formatDate, formatPhone } from "@/lib/utils";
import { Avatar, EmptyState, StatusBadge, VerifiedBadge } from "@/components/ui";
import { AdminProviderActions } from "@/components/admin-actions";
import { AdminPageHeader, AdminStat, FilterChip, withParam } from "@/components/admin-ui";

export const metadata = { title: "Admin — Prestadores" };

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovados",
  PENDING: "Em análise",
  SUSPENDED: "Suspensos",
  REJECTED: "Recusados",
};

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUS_LABEL[sp.status] ? sp.status : undefined;

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
  const approved = rows.filter((r) => r.provider.status === "APPROVED");
  const suspended = rows.filter((r) => r.provider.status === "SUSPENDED");

  const matchesStatus = (status_: string) => !status || status_ === status;
  const pendingVisible = pending.filter((r) => matchesStatus(r.provider.status));
  const others = rows.filter((r) => r.provider.status !== "PENDING" && matchesStatus(r.provider.status));

  const chip = (value: string | undefined, label: string) => (
    <FilterChip
      label={label}
      active={!status ? value === undefined : status === value}
      href={`/admin/prestadores${withParam({ status }, "status", value)}`}
    />
  );

  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <li className="card p-4 transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/5">
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
      <AdminPageHeader title="Prestadores" subtitle={`${rows.length} cadastrados na plataforma`} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Aprovados" value={approved.length} icon={<span className="text-sm font-bold">✓</span>} tile="bg-emerald-50 text-emerald-600" sub="visíveis nas buscas" />
        <AdminStat label="Em análise" value={pending.length} icon={<span className="text-sm font-bold">⏳</span>} tile="bg-amber-50 text-amber-600" sub="aguardando moderação" href="/admin/prestadores?status=PENDING" />
        <AdminStat label="Suspensos" value={suspended.length} icon={<span className="text-sm font-bold">⚠</span>} tile="bg-red-50 text-red-500" sub="fora do ar" />
        <AdminStat label="Total" value={rows.length} icon={<span className="text-sm font-bold">Σ</span>} sub="todos os status" />
      </div>

      <div className="flex flex-wrap gap-2">
        {chip(undefined, "Todos")}
        {chip("APPROVED", STATUS_LABEL.APPROVED!)}
        {chip("PENDING", STATUS_LABEL.PENDING!)}
        {chip("SUSPENDED", STATUS_LABEL.SUSPENDED!)}
        {chip("REJECTED", STATUS_LABEL.REJECTED!)}
      </div>

      {pendingVisible.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-600">
            ⏳ Aguardando aprovação ({pendingVisible.length})
          </h2>
          <ul className="space-y-3">
            {pendingVisible.map((r) => (
              <Row key={r.provider.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Todos</h2>
        {others.length === 0 ? (
          <EmptyState icon={<span>👷</span>} title="Nenhum prestador encontrado" description="Ajuste o filtro de status." />
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
