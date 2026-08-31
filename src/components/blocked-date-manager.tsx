"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { addBlockedDateAction, removeBlockedDateAction, type OnboardingState } from "@/server/actions/provider-onboarding";

export function BlockedDateManager({ blocked, today }: { blocked: { id: number; date: string; reason: string | null }[]; today: string }) {
  const [addState, addAction, addPending] = useActionState(
    async (_prev: OnboardingState | undefined, formData: FormData) =>
      addBlockedDateAction(String(formData.get("date")), String(formData.get("reason") ?? "") || undefined),
    undefined,
  );
  const [removeState, removeAction, removePending] = useActionState(
    async (_prev: OnboardingState | undefined, id: number) => removeBlockedDateAction(id),
    undefined,
  );

  const upcoming = blocked.filter((b) => b.date >= today);
  const past = blocked.length - upcoming.length;

  return (
    <div className="card p-4">
      <form action={addAction} className="flex flex-wrap gap-2">
        <input
          type="date"
          name="date"
          required
          min={today}
          className="w-44 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          aria-label="Data"
        />
        <input name="reason" className="input flex-1" placeholder="Motivo (opcional)" />
        <button className="btn-outline" disabled={addPending}>
          <Lock size={14} className="sm:mr-1" /> Bloquear
        </button>
      </form>
      {addState?.error && <p className="mt-2 text-xs font-medium text-[var(--danger)]">{addState.error}</p>}
      {addState?.success && <p className="mt-2 text-xs font-medium text-emerald-600">{addState.success}</p>}
      {removeState?.error && <p className="mt-2 text-xs font-medium text-[var(--danger)]">{removeState.error}</p>}
      {removeState?.success && <p className="mt-2 text-xs font-medium text-emerald-600">{removeState.success}</p>}

      {upcoming.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">
                {b.date} {b.reason ? `· ${b.reason}` : ""}
              </span>
              <form
                action={async () => {
                  if (!window.confirm(`Liberar a data ${b.date}? Clientes voltarão a poder agendar neste dia.`)) {
                    return;
                  }
                  removeAction(b.id);
                }}
              >
                <button disabled={removePending} className="text-xs font-medium text-[var(--danger)]">
                  Liberar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {upcoming.length === 0 && (
        <p className="mt-3 text-xs text-slate-400">Nenhuma data bloqueada.</p>
      )}
      {past > 0 && (
        <p className="mt-2 text-[11px] text-slate-300">
          {past} data(s) passada(s) ocultada(s) do histórico.
        </p>
      )}
    </div>
  );
}
