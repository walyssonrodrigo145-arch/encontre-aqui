"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  createFinanceEntryAction,
  deleteFinanceEntryAction,
  registerAppointmentIncomeAction,
  type FinanceState,
} from "@/server/actions/finance";
import { formatMoney } from "@/lib/utils";

export interface FinanceEntryRow {
  id: number;
  kind: "INCOME" | "EXPENSE";
  title: string;
  amountCents: number;
  occurredAt: string; // yyyy-mm-dd
  category: string;
  notes: string | null;
  source: "MANUAL" | "PLATFORM";
}

export interface PendingAppointment {
  appointmentId: number;
  customerName: string;
  serviceName: string | null;
  completedAt: string; // ISO
}

const CATEGORY_LABEL: Record<string, string> = {
  servico: "Serviço",
  assessoria: "Assessoria",
  outro: "Outro",
  materiais: "Materiais",
  transporte: "Transporte",
  combustivel: "Combustível",
  ferramentas: "Ferramentas",
  marketing: "Marketing",
  impostos: "Impostos",
};

const INCOME_CATEGORIES = ["servico", "assessoria", "outro"];
const EXPENSE_CATEGORIES = ["materiais", "transporte", "combustivel", "ferramentas", "marketing", "impostos", "outro"];

function money(v: number) {
  return formatMoney(v);
}

function dateBR(v: string) {
  return v.split("-").reverse().join("/");
}

function Feedback({ state }: { state?: FinanceState }) {
  if (state?.error)
    return (
      <p className="flex items-center gap-1.5 text-sm text-[var(--danger)]">
        <AlertCircle size={14} /> {state.error}
      </p>
    );
  if (state?.success)
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 size={14} /> {state.success}
      </p>
    );
  return null;
}

export function FinanceManager({
  entries,
  pendingAppointments,
  today,
}: {
  entries: FinanceEntryRow[];
  pendingAppointments: PendingAppointment[];
  today: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [incomeFormFor, setIncomeFormFor] = useState<number | null>(null);
  const [createState, createAction, createPending] = useActionState<FinanceState | undefined, FormData>(
    createFinanceEntryAction,
    undefined,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<FinanceState | undefined, number>(
    async (_prev, id) => deleteFinanceEntryAction(id),
    undefined,
  );
  const [incomeState, incomeAction, incomePending] = useActionState<FinanceState | undefined, FormData>(
    async (_prev, fd) => registerAppointmentIncomeAction(_prev, fd),
    undefined,
  );

  const openForm = (kind: "INCOME" | "EXPENSE") => {
    setFormKind(kind);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* botões de novo lançamento */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => openForm("INCOME")} className="card flex items-center gap-3 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ArrowUpCircle size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-800">Nova receita</span>
            <span className="block text-xs text-slate-400">Dinheiro que entrou</span>
          </span>
        </button>
        <button onClick={() => openForm("EXPENSE")} className="card flex items-center gap-3 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/10">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <ArrowDownCircle size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-800">Nova despesa</span>
            <span className="block text-xs text-slate-400">Dinheiro que saiu</span>
          </span>
        </button>
      </div>

      {/* pendências de recebimento */}
      {pendingAppointments.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Wallet size={15} /> {pendingAppointments.length} serviço(s) concluído(s) para registrar receita
          </h3>
          <ul className="mt-3 space-y-2.5">
            {pendingAppointments.map((p) => (
              <li key={p.appointmentId}>
                {incomeFormFor === p.appointmentId ? (
                  <form action={incomeAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-emerald-200 bg-white p-3">
                    <input type="hidden" name="appointmentId" value={p.appointmentId} />
                    <input type="hidden" name="occurredAt" value={today} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-700">
                        {p.customerName}
                        {p.serviceName ? ` · ${p.serviceName}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-400">{dateBR(p.completedAt.split("T")[0]!)}</p>
                    </div>
                    <input
                      name="amount"
                      required
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      className="w-28 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                      aria-label="Valor recebido"
                    />
                    <button disabled={incomePending} className="btn-primary px-3 py-2 text-xs">
                      {incomePending ? "..." : "Registrar"}
                    </button>
                    <button type="button" onClick={() => setIncomeFormFor(null)} className="btn-ghost px-2 py-2 text-xs">
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-700">
                        {p.customerName}
                        {p.serviceName ? ` · ${p.serviceName}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-400">{dateBR(p.completedAt.split("T")[0]!)}</p>
                    </div>
                    <button
                      onClick={() => setIncomeFormFor(p.appointmentId)}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      Registrar receita
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {incomeState?.error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger)]">
              <AlertCircle size={12} /> {incomeState.error}
            </p>
          )}
        </div>
      )}

      {/* lista de lançamentos */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900">Lançamentos</h3>
          <p className="text-xs text-slate-400">
            {entries.length} registro(s) · despesas da plataforma aparecem com o selo Encontre Aqui
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-slate-400">
            Nenhum lançamento ainda. Use os botões acima ou registre a receita de um serviço concluído.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {entries.map((e) => {
              const isIncome = e.kind === "INCOME";
              return (
                <li key={`${e.source}-${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isIncome ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                      }`}
                    >
                      {isIncome ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-700">
                        {e.title}
                        {e.source === "PLATFORM" && (
                          <span className="badge rounded-full bg-[var(--primary-light)] text-[var(--primary-dark)]">
                            Encontre Aqui
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dateBR(e.occurredAt)} · {CATEGORY_LABEL[e.category] ?? e.category}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                      {isIncome ? "+" : "−"} {money(e.amountCents)}
                    </span>
                    {e.source === "MANUAL" && (
                      <div className="flex items-center">
                        {confirmingDelete === e.id ? (
                          <>
                            <button
                              disabled={deletePending}
                              onClick={() => {
                                deleteAction(e.id);
                                setConfirmingDelete(null);
                              }}
                              className="btn-danger px-2.5 py-1.5 text-[11px]"
                            >
                              {deletePending ? "..." : "Confirmar"}
                            </button>
                            <button onClick={() => setConfirmingDelete(null)} className="btn-ghost px-2 py-1.5 text-[11px]">
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmingDelete(e.id)}
                            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remover ${e.title}`}
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {deleteState?.error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger)]">
            <AlertCircle size={12} /> {deleteState.error}
          </p>
        )}
      </div>

      {/* ── Modal de novo lançamento ── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Novo lançamento financeiro"
        >
          <div
            className="max-h-[85vh] w-[95vw] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-extrabold text-slate-900">
                {formKind === "INCOME" ? "Nova receita" : "Nova despesa"}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form action={createAction} className="mt-4 space-y-3.5">
              <input type="hidden" name="kind" value={formKind} />
              <div>
                <label className="label" htmlFor="fin-title">Descrição</label>
                <input
                  id="fin-title"
                  name="title"
                  required
                  minLength={2}
                  maxLength={120}
                  className="input"
                  placeholder={formKind === "INCOME" ? "Ex: Instalação na rua X" : "Ex: Material elétrico"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="fin-amount">Valor (R$)</label>
                  <input
                    id="fin-amount"
                    name="amount"
                    required
                    inputMode="decimal"
                    className="input"
                    placeholder="Ex: 250,00"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="fin-date">Data</label>
                  <input
                    id="fin-date"
                    name="occurredAt"
                    type="date"
                    required
                    defaultValue={today}
                    max={today}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="fin-category">Categoria</label>
                <select id="fin-category" name="category" className="input" defaultValue={formKind === "INCOME" ? "servico" : "materiais"}>
                  {(formKind === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c] ?? c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fin-notes">Observação (opcional)</label>
                <input id="fin-notes" name="notes" maxLength={300} className="input" placeholder="Anotação livre" />
              </div>

              <Feedback state={createState} />

              <div className="flex gap-2 pt-1">
                <button disabled={createPending} className="btn-primary flex-1">
                  {createPending ? "Salvando..." : "Salvar lançamento"}
                </button>
                <button type="button" onClick={() => setFormOpen(false)} className="btn-outline px-4">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
