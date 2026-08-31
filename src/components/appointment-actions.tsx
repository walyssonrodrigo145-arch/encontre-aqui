"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, X, ArrowRight, Ban, Star } from "lucide-react";
import {
  cancelAppointmentAction,
  updateAppointmentStatusAction,
} from "@/server/actions/appointments";

export function AppointmentActions({
  appointmentId,
  status,
  role,
  scheduledAt,
}: {
  appointmentId: number;
  status: string;
  role: "CUSTOMER" | "PROVIDER";
  scheduledAt?: Date;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedMin, setReschedMin] = useState("");
  const [reason, setReason] = useState("");
  const [newTime, setNewTime] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      try {
        const res = await fn();
        if (res?.error) setError(res.error);
        else {
          setError(undefined);
          router.refresh();
        }
      } catch {
        setError("Ocorreu um erro inesperado. Tente novamente.");
      }
    });
  };

  const advance = (to: string, options?: { proposedAt?: Date }) =>
    run(() => updateAppointmentStatusAction(appointmentId, to, options));

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
      <button key="reschedule" disabled={pending} onClick={() => {
        setReschedMin(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
        setShowReschedule((v) => !v);
      }} className="btn-outline py-2 text-xs">
        <CalendarClock size={14} /> Remarcar
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

  // remarcação proposta: cliente aceita/recusa; prestador aguarda (e pode cancelar)
  if (status === "RESCHEDULE_PROPOSED") {
    if (role === "CUSTOMER") {
      buttons.push(
        <button key="acceptResched" disabled={pending} onClick={() => advance("BOOKING_CONFIRMED")} className="btn-primary py-2 text-xs">
          <Check size={14} /> Aceitar novo horário
        </button>,
        <button key="rejectResched" disabled={pending} onClick={() => setShowCancel(true)} className="btn-outline py-2 text-xs">
          <X size={14} /> Recusar
        </button>,
      );
    } else {
      buttons.push(
        <span key="wait" className="inline-flex items-center gap-1 text-xs text-slate-400">
          <CalendarClock size={13} /> Aguardando resposta do cliente
        </span>,
      );
    }
  }

  if (["BOOKING_CONFIRMED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULE_PROPOSED"].includes(status)) {
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
        {role === "PROVIDER" && <Link2Chat appointmentId={appointmentId} />}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}

      {showReschedule && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <label className="text-xs font-medium text-slate-500" htmlFor={`resched-${appointmentId}`}>
            Nova data e hora:
          </label>
          <input
            id={`resched-${appointmentId}`}
            type="datetime-local"
            className="w-60 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
            value={newTime}
            min={reschedMin || undefined}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <button
            disabled={pending || !newTime}
            onClick={() => {
              const proposedAt = new Date(`${newTime}:00-03:00`);
              if (Number.isNaN(proposedAt.getTime())) {
                setError("Data inválida.");
                return;
              }
              advance("RESCHEDULE_PROPOSED", { proposedAt });
              setShowReschedule(false);
            }}
            className="btn-primary py-2 text-xs"
          >
            Enviar proposta
          </button>
          <button onClick={() => setShowReschedule(false)} className="btn-ghost py-2 text-xs">
            Voltar
          </button>
          <p className="w-full text-[11px] text-slate-400">
            O cliente receberá a proposta e a nova data vale após a aceitação.
            {scheduledAt ? ` Data atual: ${scheduledAt.toLocaleDateString("pt-BR")}.` : ""}
          </p>
        </div>
      )}

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
    <Link href={`/mensagens?agendamento=${appointmentId}`} className="btn-ghost py-2 text-xs">
      <ArrowRight size={13} /> Conversar
    </Link>
  );
}
