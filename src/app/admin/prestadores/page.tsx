import Link from "next/link";
import { Check, Clock, AlertTriangle, Search, Users } from "lucide-react";
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
  const q = String(sp.q ?? "").trim();
  const pageRaw = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const PAGE_SIZE = 10;

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

  const matchesStatus = (status_: string) => !status || status_ === status;
  const matchesQuery = (r: (typeof rows)[number]) =>
    !q || `${r.provider.displayName} ${r.email} ${r.provider.city ?? ""}`.toLowerCase().includes(q.toLowerCase());

  const pending = rows.filter((r) => r.provider.status === "PENDING");
  const approved = rows.filter((r) => r.provider.status === "APPROVED");
  const suspended = rows.filter((r) => r.provider.status === "SUSPENDED");
  const pendingVisible = pending.filter((r) => matchesStatus(r.provider.status) && matchesQuery(r));
  const othersAll = rows.filter(
    (r) => r.provider.status !== "PENDING" && matchesStatus(r.provider.status) && matchesQuery(r),
  );
  const totalPages = Math.max(1, Math.ceil(othersAll.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const others = othersAll.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chip = (value: string | undefined, label: string) => (
    <FilterChip
      label={label}
      active={!status ? value === undefined : status === value}
      href={`/admin/prestadores${withParam({ q: q || undefined, page: undefined }, "status", value)}`}
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
        <AdminStat label="Aprovados" value={approved.length} icon={<Check size={18} />} tile="bg-emerald-50 text-emerald-600" sub="visíveis nas buscas" />
        <AdminStat label="Em análise" value={pending.length} icon={<Clock size={18} />} tile="bg-amber-50 text-amber-600" sub="aguardando moderação" href="/admin/prestadores?status=PENDING" />
        <AdminStat label="Suspensos" value={suspended.length} icon={<AlertTriangle size={18} />} tile="bg-red-50 text-red-500" sub="fora do ar" />
        <AdminStat label="Total" value={rows.length} icon={<Users size={18} />} sub="todos os status" />
      </div>

      <div className="flex flex-wrap gap-2">
        {chip(undefined, "Todos")}
        {chip("APPROVED", STATUS_LABEL.APPROVED!)}
        {chip("PENDING", STATUS_LABEL.PENDING!)}
        {chip("SUSPENDED", STATUS_LABEL.SUSPENDED!)}
        {chip("REJECTED", STATUS_LABEL.REJECTED!)}
      </div>

      {/* busca */}
      <form className="relative max-w-md">
        {q && <input type="hidden" name="status" value={status ?? ""} />}
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, e-mail ou cidade..."
          className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          aria-label="Buscar prestador"
        />
      </form>

      {pendingVisible.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-600">
            â³ Aguardando aprovação ({pendingVisible.length})
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
          <EmptyState icon={<span>ðŸ‘·</span>} title="Nenhum prestador encontrado" description="Ajuste a busca ou o filtro de status." />
        ) : (
          <ul className="space-y-3">
            {others.map((r) => (
              <Row key={r.provider.id} r={r} />
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/prestadores${withParam({ q: q || undefined, status }, "page", String(Math.max(1, safePage - 1)))}`}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-slate-500"
                aria-label="Página anterior"
              >
                â†
              </Link>
              <span className="rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
                {safePage}
              </span>
              <span className="px-1 text-xs text-slate-400">de {totalPages}</span>
              <Link
                href={`/admin/prestadores${withParam({ q: q || undefined, status }, "page", String(Math.min(totalPages, safePage + 1)))}`}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-slate-500"
                aria-label="Próxima página"
              >
                â†’
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Mostrando {others.length} de {othersAll.length} prestadores
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
