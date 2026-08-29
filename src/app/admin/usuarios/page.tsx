import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, providers, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { Avatar, EmptyState, StatusBadge } from "@/components/ui";
import { AdminUserActions } from "@/components/admin-actions";
import { UsersSearch } from "@/components/users-search";

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
    if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold text-slate-900">Usuários</h2>
        <p className="text-sm text-slate-500">
          {filtered.length} de {rows.length} contas
        </p>
      </div>

      <UsersSearch defaultQ={q} />

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
