"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { respondQuoteAction, type ActionState } from "@/server/actions/quotes";

export function RespondQuoteForm({ quoteId }: { quoteId: number }) {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(respondQuoteAction, undefined);
  const [open, setOpen] = useState(false);

  if (state?.success) {
    return (
      <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 size={15} /> {state.success}
      </p>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary py-2 text-sm">
          <Send size={14} /> Responder orçamento
        </button>
      ) : (
        <form action={action} className="space-y-3 rounded-xl bg-slate-50 p-3">
          <input type="hidden" name="quoteId" value={quoteId} />
          {state?.error && (
            <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
              <AlertCircle size={14} /> {state.error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Valor estimado (R$)</label>
              <input name="price" required type="number" step="0.01" min={1} className="input" placeholder="250,00" />
            </div>
            <div>
              <label className="label">Prazo (dias)</label>
              <input name="estimatedDays" type="number" min={0} className="input" placeholder="1" />
            </div>
          </div>
          <div>
            <label className="label">Observação (opcional)</label>
            <input name="note" className="input" placeholder="Ex: valor inclui material..." />
          </div>
          <div className="flex gap-2">
            <button disabled={pending} className="btn-primary py-2 text-sm">
              {pending ? "Enviando..." : "Enviar orçamento"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost py-2 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
