"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Info, Layers, Pencil, Plus, Power, Search } from "lucide-react";
import { togglePlanAction, upsertPlanAction, type AdminState } from "@/server/actions/admin";
import { formatMoney } from "@/lib/utils";

export interface AdminPlan {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  description: string | null;
  maxPhotos: number;
  maxPortfolio: number;
  searchBoost: number;
  isActive: boolean;
  subscribers: number;
}

const PAGE_SIZE = 6;

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

export function PlansManager({ plans }: { plans: AdminPlan[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [desc, setDesc] = useState("");
  const [formKey, setFormKey] = useState(0); // reset dos campos ao entrar em modo edição
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [, startToggling] = useTransition();
  const [listFeedback, setListFeedback] = useState<{ error?: string; success?: string }>({});
  const [state, action, pending] = useActionState<AdminState | undefined, FormData>(upsertPlanAction, undefined);

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "inactive" && p.isActive) return false;
      return true;
    });
  }, [plans, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const startEdit = (plan: AdminPlan) => {
    setEditing(plan);
    setDesc(plan.description ?? "");
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") {
      document.getElementById("plan-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setDesc("");
    setFormKey((k) => k + 1);
  };

  const toggle = (plan: AdminPlan) => {
    setTogglingId(plan.id);
    startToggling(async () => {
      const res = await togglePlanAction(plan.id, !plan.isActive);
      setListFeedback(res.error ? { error: res.error } : { success: res.success });
      setTogglingId(null);
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      {/* ── Lista de planos ── */}
      <div className="card p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Planos cadastrados</h2>
        <p className="mt-0.5 text-xs text-slate-500">Visualize e gerencie seus planos existentes.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome do plano..."
              className="w-full rounded-xl border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
              aria-label="Buscar plano"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-600"
            aria-label="Filtrar por status"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Status: Ativos</option>
            <option value="inactive">Status: Inativos</option>
          </select>
        </div>

        <ul className="mt-4 space-y-2.5">
          {visible.map((plan) => (
            <li
              key={plan.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/5 ${
                editing?.id === plan.id ? "border-[var(--primary)] bg-[var(--primary-soft)]/40" : "border-[var(--border)]"
              }`}
            >
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
                {initialOf(plan.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{plan.name}</p>
                <p className="truncate text-xs text-slate-500">
                  <span className="font-semibold text-[var(--primary)]">{formatMoney(plan.priceCents)}/mês</span>
                  {" · "}
                  {plan.subscribers} assinante(s)
                </p>
              </div>
              <span
                className={`badge rounded-full ${
                  plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {plan.isActive ? "Ativo" : "Inativo"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(plan)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  aria-label={`Editar plano ${plan.name}`}
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggle(plan)}
                  disabled={togglingId === plan.id}
                  className={`rounded-lg p-2 transition hover:bg-slate-100 ${
                    plan.isActive ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                  }`}
                  aria-label={plan.isActive ? `Desativar plano ${plan.name}` : `Ativar plano ${plan.name}`}
                  title={plan.isActive ? "Desativar" : "Ativar"}
                >
                  <Power size={15} />
                </button>
              </div>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
              Nenhum plano encontrado com esses filtros.
            </li>
          )}
        </ul>

        {listFeedback.error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger)]">
            <AlertCircle size={13} /> {listFeedback.error}
          </p>
        )}
        {listFeedback.success && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 size={13} /> {listFeedback.success}
          </p>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-slate-500 disabled:opacity-40"
                aria-label="Página anterior"
              >
                ←
              </button>
              <span className="rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
                {safePage}
              </span>
              <span className="px-1 text-xs text-slate-400">de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-slate-500 disabled:opacity-40"
                aria-label="Próxima página"
              >
                →
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Mostrando {visible.length} de {filtered.length} planos
            </p>
          </div>
        )}
      </div>

      {/* ── Formulário ── */}
      <div className="card p-5" id="plan-form-card">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Layers size={20} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              {editing ? `Editar: ${editing.name}` : "Novo plano"}
            </h2>
            <p className="text-xs text-slate-500">
              {editing ? "Altere os dados e salve." : "Preencha os dados para criar um novo plano de assinatura."}
            </p>
          </div>
        </div>

        <form key={formKey} action={action} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          <div>
            <label className="label" htmlFor="plan-name">Nome do plano</label>
            <input
              id="plan-name"
              name="name"
              required
              minLength={3}
              maxLength={40}
              defaultValue={editing?.name ?? ""}
              placeholder="Ex: Básico"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="plan-price">Preço mensal (R$)</label>
              <input
                id="plan-price"
                name="price"
                required
                inputMode="decimal"
                defaultValue={editing ? (editing.priceCents / 100).toFixed(2).replace(".", ",") : ""}
                placeholder="Ex: 29,90"
                className="input"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1" htmlFor="plan-boost">
                Boost nas buscas (0 – 0.3)
                <Info size={12} className="text-slate-400" />
              </label>
              <input
                id="plan-boost"
                name="searchBoost"
                inputMode="decimal"
                defaultValue={editing?.searchBoost ?? ""}
                placeholder="Ex: 0.1"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="plan-photos">Máx. fotos</label>
              <input
                id="plan-photos"
                name="maxPhotos"
                type="number"
                min={1}
                max={50}
                defaultValue={editing?.maxPhotos ?? ""}
                placeholder="Ex: 3"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="plan-portfolio">Máx. portfólio</label>
              <input
                id="plan-portfolio"
                name="maxPortfolio"
                type="number"
                min={1}
                max={100}
                defaultValue={editing?.maxPortfolio ?? ""}
                placeholder="Ex: 10"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="plan-desc">Descrição do plano</label>
            <textarea
              id="plan-desc"
              name="description"
              rows={3}
              maxLength={200}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descreva os benefícios e recursos deste plano..."
              className="input resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{desc.length}/200</p>
          </div>

          {state?.error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              <AlertCircle size={14} /> {state.error}
            </p>
          )}
          {state?.success && (
            <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={14} /> {state.success} {editing && "Você pode seguir editando ou criar outro."}
            </p>
          )}

          <div className="rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)]/60 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary-dark)]">
              <Info size={13} /> Dica
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Use descrições claras e objetivas para ajudar os prestadores a entenderem o valor do seu plano.
            </p>
          </div>

          <div className="flex gap-2">
            <button disabled={pending} className="btn-gradient flex-1 py-3 text-[15px]">
              <Plus size={16} className="mr-1" />
              {pending ? "Salvando..." : editing ? "Salvar alterações" : "Criar plano"}
            </button>
            {editing && (
              <button type="button" onClick={cancelEdit} className="btn-outline px-4 text-sm">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
