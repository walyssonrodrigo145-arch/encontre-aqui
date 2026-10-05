import { desc, eq, sql } from "drizzle-orm";
import { User, Users } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, customers, providers, users } from "@/lib/schema";
import { EmptyState } from "@/components/ui";
import { UsersSearch } from "@/components/users-search";
import { UsersClient } from "@/components/admin-users-client";
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
  // "RESTRITO" = qualquer status não-ativo (suspensos + bloqueados)
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" || sp.status === "BLOCKED" ? sp.status : undefined;
  const restrito = sp.status === "RESTRITO";

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
    if (restrito && u.status === "ACTIVE") return false;
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
          {filtered.length} de {rows.length} contas — clique em uma conta para ver detalhes e ações.
        </p>
      </div>

      {/* cards clicáveis = atalhos de filtro */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat
          label="Total de contas"
          value={stats.total}
          icon={<Users size={18} />}
          sub="todos os papéis"
          href={`/admin/usuarios${withParam({ q: q || undefined }, "role", undefined)}`}
        />
        <AdminStat
          label="Clientes"
          value={stats.clientes}
          icon={<User size={18} />}
          tile="bg-emerald-50 text-emerald-600"
          sub="filtrar role CUSTOMER"
          href={`/admin/usuarios${withParam({ q: q || undefined, status }, "role", "CUSTOMER")}`}
        />
        <AdminStat
          label="Prestadores"
          value={stats.prestadores}
          icon={<User size={18} />}
          tile="bg-sky-50 text-sky-600"
          sub="filtrar role PROVIDER"
          href={`/admin/usuarios${withParam({ q: q || undefined, status }, "role", "PROVIDER")}`}
        />
        <AdminStat
          label="Restritos"
          value={stats.restritos}
          icon={<User size={18} />}
          tile="bg-amber-50 text-amber-600"
          sub="filtrar suspensos/bloqueados"
          href={`/admin/usuarios${withParam({ q: q || undefined, role }, "status", "RESTRITO")}`}
        />
      </div>

      <UsersSearch defaultQ={q} />

      <div className="flex flex-wrap gap-2">
        {chip("Todos os status", undefined, !status && !restrito)}
        {chip("Ativos", "ACTIVE", status === "ACTIVE")}
        {chip("Suspensos", "SUSPENDED", status === "SUSPENDED")}
        {chip("Bloqueados", "BLOCKED", status === "BLOCKED")}
        {chip("Restritos", "RESTRITO", restrito)}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<span>👤</span>} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <UsersClient
          users={filtered.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt.toISOString(),
            providerId: u.providerId,
            verificationLevel: u.verificationLevel,
            apptCount: Number(u.apptCount),
          }))}
        />
      )}
    </div>
  );
}
