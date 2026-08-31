import { desc, eq, sql } from "drizzle-orm";
import { User, Users } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, customers, providers, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { Avatar, EmptyState, StatusBadge } from "@/components/ui";
import { AdminUserActions } from "@/components/admin-actions";
import { UsersSearch } from "@/components/users-search";
import { AdminStat, FilterChip, withParam } from "@/components/admin-ui";

export const metadata = { title: "Admin — Usuários" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const role = sp.role === "CUSTOMER" || sp.role === "PROVIDER" || sp.role === "ADMIN" ? sp.role : undefined;
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" || sp.status === "BLOCKED" ? sp.status : undefined;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      providerId: providers.id,
      verificationLevel: providers.verificationLevel,
      apptCount: sql<number>`(select count(*) from ${appointments} a join ${customers} c on a.customer_id = c.id where c.user_id = ${users.id})`,
    })
    .from(users)
    .leftJoin(providers, eq(providers.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(200);

  const filtered = rows.filter((u) => {
    if (role && u.role !== role) return false;
    if (status && u.status !== status) return false;
    if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: rows.length,
    clientes: rows.filter((u) => u.role === "CUSTOMER").length,
    prestadores: rows.filter((u) => u.role === "PROVIDER").length,
    restritos: rows.filter((u) => u.status !== "ACTIVE").length,
  };

  const chip = (label: string, value: string | undefined, active: boolean) => (
    <FilterChip
      label={label}
      active={active}
      href={`/admin/usuarios${withParam({ q: q || undefined, role, status }, "status", value)}`}
    />
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold text-slate-900">Usuários</h2>
        <p className="text-sm text-slate-500">
          {filtered.length} de {rows.length} contas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Total de contas" value={stats.total} icon={<Users size={18} />} sub="todos os papéis" />
        <AdminStat label="Clientes" value={stats.clientes} icon={<User size={18} />} tile="bg-emerald-50 text-emerald-600" sub="role CUSTOMER" />
        <AdminStat label="Prestadores" value={stats.prestadores} icon={<User size={18} />} tile="bg-sky-50 text-sky-600" sub="role PROVIDER" />
        <AdminStat label="Restritos" value={stats.restritos} icon={<User size={18} />} tile="bg-amber-50 text-amber-600" sub="suspensos ou bloqueados" />
      </div>

      <UsersSearch defaultQ={q} />

      <div className="flex flex-wrap gap-2">
        {chip("Todos os status", undefined, !status)}
        {chip("Ativos", "ACTIVE", status === "ACTIVE")}
        {chip("Suspensos", "SUSPENDED", status === "SUSPENDED")}
        {chip("Bloqueados", "BLOCKED", status === "BLOCKED")}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<span>👤</span>} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="p-4 font-medium">Usuário</th>
                  <th className="p-4 font-medium">Perfil</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Cadastro</th>
                  <th className="p-4 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/60">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size={36} />
                        <div>
                          <p className="font-semibold text-slate-700">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`badge ${
                          u.role === "ADMIN"
                            ? "bg-violet-100 text-violet-700"
                            : u.role === "PROVIDER"
                              ? "bg-[var(--primary-light)] text-[var(--primary-dark)]"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "ADMIN" ? "Admin" : u.role === "PROVIDER" ? "Prestador" : "Cliente"}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        status={u.status}
                        label={u.status === "ACTIVE" ? "Ativo" : u.status === "SUSPENDED" ? "Suspenso" : "Bloqueado"}
                      />
                    </td>
                    <td className="p-3 text-xs text-slate-400">{formatDate(u.createdAt, false)}</td>
                    <td className="p-3">
                      <AdminUserActions userId={u.id} status={u.status} role={u.role} userName={u.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile/tablet) */}
          <ul className="space-y-3 lg:hidden">
            {filtered.map((u) => (
              <li key={u.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={u.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-700">{u.name}</p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`badge ${
                          u.role === "ADMIN"
                            ? "bg-violet-100 text-violet-700"
                            : u.role === "PROVIDER"
                              ? "bg-[var(--primary-light)] text-[var(--primary-dark)]"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "ADMIN" ? "Admin" : u.role === "PROVIDER" ? "Prestador" : "Cliente"}
                      </span>
                      <StatusBadge
                        status={u.status}
                        label={u.status === "ACTIVE" ? "Ativo" : u.status === "SUSPENDED" ? "Suspenso" : "Bloqueado"}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2 text-right">
                  <AdminUserActions userId={u.id} status={u.status} role={u.role} userName={u.name} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
