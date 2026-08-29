"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowRight, Ban, Star } from "lucide-react";
import {
  cancelAppointmentAction,
  updateAppointmentStatusAction,
} from "@/server/actions/appointments";

export function AppointmentActions({
  appointmentId,
  status,
  role,
}: {
  appointmentId: number;
  status: string;
  role: "CUSTOMER" | "PROVIDER";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const advance = (to: string) => run(() => updateAppointmentStatusAction(appointmentId, to));

  const buttons: React.ReactNode[] = [];

  if (status === "BOOKING_REQUESTED") {
    if (role === "PROVIDER") {
      buttons.push(
        <button key="accept" disabled={pending} onClick={() => advance("BOOKING_CONFIRMED")} className="btn-primary py-2 text-xs">
          <Check size={14} /> Aceitar
        </button>,
        <button key="reject" disabled={pending} onClick={() => setShowCancel(true)} className="btn-outline py-2 text-xs">
          <X size={14} /> Recusar
        </button>,
      );
    } else {
      buttons.push(
        <button key="cancel" disabled={pending} onClick={() => setShowCancel(true)} className="btn-outline py-2 text-xs text-[var(--danger)]">
          <Ban size={14} /> Cancelar
        </button>,
      );
    }
  }

  if (status === "BOOKING_CONFIRMED" && role === "PROVIDER") {
    buttons.push(
      <button key="way" disabled={pending} onClick={() => advance("ON_THE_WAY")} className="btn-primary py-2 text-xs">
        🚗 A caminho
      </button>,
    );
  }

  if (status === "ON_THE_WAY" && role === "PROVIDER") {
    buttons.push(
      <button key="progress" disabled={pending} onClick={() => advance("IN_PROGRESS")} className="btn-primary py-2 text-xs">
        🔧 Iniciar serviço
      </button>,
    );
  }

  if (status === "IN_PROGRESS" && role === "PROVIDER") {
    buttons.push(
      <button key="done" disabled={pending} onClick={() => advance("COMPLETED")} className="btn-primary py-2 text-xs">
        <Check size={14} /> Concluir serviço
      </button>,
    );
  }

  if (["BOOKING_CONFIRMED", "ON_THE_WAY", "IN_PROGRESS"].includes(status)) {
    buttons.push(
      <button key="cancel2" disabled={pending} onClick={() => setShowCancel(true)} className="btn-outline py-2 text-xs text-[var(--danger)]">
        <Ban size={14} /> Cancelar
      </button>,
    );
  }

  if (status === "COMPLETED" && role === "PROVIDER") {
    buttons.push(
      <span key="done" className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Star size={13} className="fill-[var(--accent)] text-[var(--accent)]" /> Aguardando avaliação do cliente
      </span>,
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {buttons}
        {role === "PROVIDER" && (
          <Link2Chat appointmentId={appointmentId} />
        )}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
      {showCancel && (
        <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3">
          <input
            className="input flex-1 py-2 text-sm"
            placeholder="Motivo do cancelamento"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            disabled={pending}
            onClick={() => {
              run(() => cancelAppointmentAction(appointmentId, reason || "Sem justificativa"));
              setShowCancel(false);
            }}
            className="btn-danger py-2 text-xs"
          >
            Confirmar cancelamento
          </button>
          <button onClick={() => setShowCancel(false)} className="btn-ghost py-2 text-xs">
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}

function Link2Chat({ appointmentId }: { appointmentId: number }) {
  return (
    <a href={`/mensagens?agendamento=${appointmentId}`} className="btn-ghost py-2 text-xs">
      <ArrowRight size={13} /> Conversar
    </a>
  );
}
