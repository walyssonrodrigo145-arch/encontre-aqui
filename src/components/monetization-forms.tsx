"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Rocket, X } from "lucide-react";
import { cancelSubscriptionAction, createBoostAction, subscribeAction, type MonetizationState } from "@/server/actions/monetization";
import { BOOST_DAYS, BOOST_CONFIG, boostPriceCents } from "@/lib/boost";

export function SubscribeButtons({ planId }: { planId: number }) {
  const [state, action, pending] = useActionState<MonetizationState | undefined, FormData>(subscribeAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      {state?.error && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--danger)]">
          <AlertCircle size={13} /> {state.error}
        </p>
      )}
      {state?.success ? (
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={15} /> {state.success}
        </p>
      ) : (
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Processando..." : "Assinar plano"}
        </button>
      )}
    </form>
  );
}

export function CancelSubButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn-ghost py-1.5 text-xs text-[var(--danger)]"
        >
          <X size={13} /> Cancelar assinatura
        </button>
      ) : (
        <>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await cancelSubscriptionAction();
                setMsg(res.success ?? res.error);
                setConfirming(false);
              })
            }
            className="btn-danger py-1.5 text-xs"
          >
            {pending ? "..." : "Confirmar"}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost py-1.5 text-xs">
            Manter
          </button>
        </>
      )}
    </div>
  );
}

const DURATIONS = [...BOOST_DAYS];
const TYPES = (Object.keys(BOOST_CONFIG) as (keyof typeof BOOST_CONFIG)[]).map((value) => ({
  value,
  label: BOOST_CONFIG[value]!.label,
  desc:
    value === "BASIC"
      ? "Mais exposição nas buscas"
      : value === "REGIONAL"
        ? "Destaque na sua cidade/região"
        : "Máxima exposição + áreas especiais",
  icon: value === "BASIC" ? "🚀" : value === "REGIONAL" ? "📍" : "⭐",
}));

export function BoostForm() {
  const [state, action, pending] = useActionState<MonetizationState | undefined, FormData>(createBoostAction, undefined);
  const [type, setType] = useState("BASIC");
  const [days, setDays] = useState(7);

  const price = boostPriceCents(type as "BASIC" | "REGIONAL" | "FEATURED", days) / 100;

  if (state?.success && state.pixQrCode) {
    // modo live: PIX gerado — aguardando pagamento (webhook confirma)
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 size={44} className="mx-auto text-[var(--primary)]" />
        <p className="mt-2 font-bold text-slate-800">{state.success}</p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PIX copia e cola</p>
          <p className="mt-2 max-h-24 overflow-y-auto break-all rounded-lg bg-white p-3 text-left text-[11px] leading-relaxed text-slate-600">
            {state.pixQrCode}
          </p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(state.pixQrCode!)}
            className="btn-outline mt-2 w-full py-2 text-xs"
          >
            Copiar código PIX
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Prazo de 3 dias. Assim que o banco confirmar, o impulsionamento ativa automaticamente.
        </p>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 size={44} className="mx-auto text-[var(--primary)]" />
        <p className="mt-2 font-bold text-slate-800">{state.success}</p>
        <p className="mt-1 text-sm text-slate-500">Acompanhe os resultados nas estatísticas do painel.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5 p-5">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="days" value={days} />
      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {TYPES.map((t) => (
          <label key={t.value} className="cursor-pointer">
            <input type="radio" className="peer sr-only" checked={type === t.value} onChange={() => setType(t.value)} />
            <span className="block rounded-xl border border-[var(--border)] p-3 text-center peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-light)]/50">
              <span className="text-xl">{t.icon}</span>
              <span className="block text-sm font-bold text-slate-700">{t.label}</span>
              <span className="block text-xs text-slate-500">{t.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div>
        <p className="label">Duração</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`min-h-[42px] rounded-xl border px-4 py-2 text-sm font-medium transition ${
                days === d
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border)] bg-white text-slate-600"
              }`}
            >
              {d} dia{d > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
        <span className="text-sm text-slate-600">Total</span>
        <span className="text-2xl font-extrabold text-slate-900">
          R$ {price.toFixed(2).replace(".", ",")}
        </span>
      </div>

      <button disabled={pending} className="btn-primary w-full py-3">
        <Rocket size={17} />
        {pending ? "Ativando..." : "Impulsionar agora"}
      </button>
      <p className="text-center text-xs text-slate-400">
        O impulsionamento aumenta sua exposição respeitando a qualidade do seu perfil — avaliações e
        taxa de resposta continuam influenciando seu posicionamento.
      </p>
    </form>
  );
}
