"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createQuoteAction, type ActionState } from "@/server/actions/quotes";

export function QuoteRequestForm({
  providerId,
  providerName,
  services,
}: {
  providerId: number;
  providerName: string;
  services: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(
    createQuoteAction,
    undefined,
  );

  if (state?.success) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-[var(--primary)]" />
        <h2 className="mt-3 text-xl font-bold text-slate-900">Solicitação enviada! 🎉</h2>
        <p className="mt-1 text-sm text-slate-500">{state.success}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/app/solicitacoes" className="btn-primary">Acompanhar solicitações</Link>
          <Link href="/busca" className="btn-outline">Buscar outros profissionais</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card mx-auto max-w-lg space-y-4 p-6">
      <input type="hidden" name="providerId" value={providerId} />
      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}
      <p className="text-sm text-slate-500">
        Solicitação para <b className="text-slate-700">{providerName}</b>
      </p>

      <div>
        <label className="label">Qual serviço você escolheu? (opcional)</label>
        <select name="serviceId" className="input">
          <option value="">Outro / não sei informar</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Descreva o que você precisa</label>
        <textarea
          name="description"
          required
          minLength={10}
          rows={4}
          className="input"
          placeholder="Ex: Preciso instalar 5 tomadas e trocar um disjuntor na cozinha..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Urgência</label>
          <select name="urgency" className="input" defaultValue="NORMAL">
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgente (esta semana)</option>
            <option value="EMERGENCY">🚨 Emergência (hoje)</option>
          </select>
        </div>
        <div>
          <label className="label">Data desejada (opcional)</label>
          <input type="date" name="desiredDate" className="input" />
        </div>
      </div>

      <div>
        <label className="label">Local aproximado do serviço</label>
        <input name="addressText" required className="input" placeholder="Ex: Bairro Centro, Teófilo Otoni" />
      </div>

      <p className="text-xs text-slate-400">
        📷 Fotos e vídeos podem ser enviados pelo chat após o primeiro contato.
      </p>

      <button disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Enviando..." : "Enviar solicitação"}
      </button>
    </form>
  );
}
