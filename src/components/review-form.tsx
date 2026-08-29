"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Star } from "lucide-react";
import { createReviewAction, type ReviewState } from "@/server/actions/reviews";

function StarPicker({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState(0);
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setValue(i)} aria-label={`${i} estrelas`}>
            <Star
              size={18}
              className={i <= value ? "fill-[var(--accent)] text-[var(--accent)]" : "fill-slate-200 text-slate-200"}
            />
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value || undefined} />
    </div>
  );
}

export function ReviewForm({ appointmentId }: { appointmentId: number }) {
  const [state, action, pending] = useActionState<ReviewState | undefined, FormData>(createReviewAction, undefined);
  const [rating, setRating] = useState(0);

  if (state?.success) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-[var(--primary)]" />
        <h2 className="mt-3 text-xl font-bold text-slate-900">Obrigado pelo feedback! 💚</h2>
        <p className="mt-1 text-sm text-slate-500">Sua avaliação ajuda outros clientes.</p>
        <Link href="/app/agendamentos" className="btn-primary mt-6">Voltar aos agendamentos</Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}

      <div className="text-center">
        <p className="label justify-center">Sua nota geral</p>
        <div className="mt-1 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} estrelas`}>
              <Star
                size={36}
                className={i <= rating ? "fill-[var(--accent)] text-[var(--accent)]" : "fill-slate-200 text-slate-200"}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      <StarPicker name="quality" label="Qualidade do trabalho" />
      <StarPicker name="punctuality" label="Pontualidade" />
      <StarPicker name="service" label="Atendimento" />
      <StarPicker name="costBenefit" label="Custo-benefício" />

      <div>
        <label className="label">Comentário (opcional)</label>
        <textarea name="comment" rows={3} className="input" placeholder="Conte como foi o atendimento..." />
      </div>

      <button disabled={pending || rating === 0} className="btn-primary w-full py-3">
        {pending ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
