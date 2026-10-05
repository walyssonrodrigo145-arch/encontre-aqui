"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Avatar, StatusBadge } from "@/components/ui";
import { AdminUserActions } from "@/components/admin-actions";
import { formatDate } from "@/lib/utils";

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string; // ISO
  providerId: number | null;
  verificationLevel: string | null;
  apptCount: number;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", PROVIDER: "Prestador", CUSTOMER: "Cliente" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Ativo", SUSPENDED: "Suspenso", BLOCKED: "Bloqueado" };

const ROLE_TILE: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  PROVIDER: "bg-[var(--primary-light)] text-[var(--primary-dark)]",
  CUSTOMER: "bg-slate-100 text-slate-600",
};

function roleBadge(role: string) {
  return (
    <span className={`badge rounded-full ${ROLE_TILE[role] ?? "bg-slate-100 text-slate-600"}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function statusBadge(status: string) {
  return (
    <StatusBadge
      status={status}
      label={STATUS_LABEL[status] ?? status}
    />
  );
}

export function UsersClient({ users }: { users: AdminUserRow[] }) {
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  return (
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
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => setSelected(u)}
                className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-[var(--primary-soft)]/40"
                title="Abrir detalhes"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={36} />
                    <div>
                      <p className="font-semibold text-slate-700">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">{roleBadge(u.role)}</td>
                <td className="p-3">{statusBadge(u.status)}</td>
                <td className="p-3 text-xs text-slate-400">{formatDate(u.createdAt, false)}</td>
                <td className="p-3 text-right">
                  <span className="text-xs font-semibold text-[var(--primary)]">Detalhes →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <ul className="space-y-3 lg:hidden">
        {users.map((u) => (
          <li
            key={u.id}
            onClick={() => setSelected(u)}
            className="card cursor-pointer p-4 transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/5"
          >
            <div className="flex items-start gap-3">
              <Avatar name={u.name} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-700">{u.name}</p>
                <p className="truncate text-xs text-slate-400">{u.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {roleBadge(u.role)}
                  {statusBadge(u.status)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Modal de detalhes ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${selected.name}`}
        >
          <div
            className="max-h-[85vh] w-[95vw] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size={52} />
                <div className="min-w-0">
                  <p className="font-display truncate text-lg font-extrabold text-slate-900">{selected.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {roleBadge(selected.role)}
                    {statusBadge(selected.status)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">E-mail</dt>
                <dd className="truncate font-medium text-slate-700">{selected.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Telefone</dt>
                <dd className="font-medium text-slate-700">{selected.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Cadastro</dt>
                <dd className="font-medium text-slate-700">{formatDate(selected.createdAt, false)}</dd>
              </div>
              {selected.role === "CUSTOMER" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Agendamentos</dt>
                  <dd className="font-medium text-slate-700">{selected.apptCount}</dd>
                </div>
              )}
              {selected.role === "PROVIDER" && selected.verificationLevel && selected.verificationLevel !== "NONE" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Verificação</dt>
                  <dd className="font-medium text-slate-700">
                    {selected.verificationLevel === "DOCUMENTS"
                      ? "Documentos"
                      : selected.verificationLevel === "PHONE"
                        ? "Telefone"
                        : "Perfil"}
                  </dd>
                </div>
              )}
            </dl>

            {selected.role !== "ADMIN" ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ações</p>
                <AdminUserActions
                  userId={selected.id}
                  status={selected.status}
                  role={selected.role}
                  userName={selected.name}
                />
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
                Contas administradoras não podem ser modificadas por aqui.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
