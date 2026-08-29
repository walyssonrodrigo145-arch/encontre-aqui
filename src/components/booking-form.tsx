"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { requestBookingAction, type BookingState } from "@/server/actions/appointments";
import type { DaySlots } from "@/server/services/availability";
import { WEEKDAYS, cn } from "@/lib/utils";

interface Slot {
  time: string;
  available: boolean;
}

function SlotGroup({
  title,
  slots,
  selectedTime,
  onSelect,
}: {
  title: string;
  slots: Slot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Clock size={12} /> {title}
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map((s) => {
          const active = selectedTime === s.time;
          return (
            <button
              key={s.time}
              type="button"
              disabled={!s.available}
              onClick={() => onSelect(s.time)}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95",
                active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30"
                  : s.available
                    ? "border-[var(--border)] bg-white text-slate-600 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300",
              )}
            >
              {s.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingForm({
  providerId,
  providerSlug,
  services,
  slots,
  quoteId,
  quoteResponseId,
  defaultAddress,
}: {
  providerId: number;
  providerName: string;
  providerSlug: string;
  services: { id: number; name: string }[];
  slots: DaySlots[];
  quoteId?: number;
  quoteResponseId?: number;
  defaultAddress: string;
}) {
  const [state, action, pending] = useActionState<BookingState | undefined, FormData>(
    requestBookingAction,
    undefined,
  );
  const [dayIndex, setDayIndex] = useState(0);
  const [weekIndex, setWeekIndex] = useState(0);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);

  // paginação por semana (o servidor envia 14 dias)
  const weeks = useMemo(() => {
    const chunks: DaySlots[][] = [];
    for (let i = 0; i < slots.length; i += 7) chunks.push(slots.slice(i, i + 7));
    return chunks;
  }, [slots]);
  const safeWeekIndex = Math.min(weekIndex, Math.max(weeks.length - 1, 0));
  const week = weeks[safeWeekIndex] ?? [];

  const day = slots[dayIndex] ?? null;
  const dayInWeek = week.some((d) => d.date === day?.date);

  const morning = day?.slots.filter((s) => parseInt(s.time.slice(0, 2), 10) < 12) ?? [];
  const afternoon = day?.slots.filter((s) => parseInt(s.time.slice(0, 2), 10) >= 12) ?? [];

  const scheduledAt = useMemo(() => {
    if (!selected) return "";
    return `${selected.date}T${selected.time}:00`;
  }, [selected]);

  const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const fmtShort = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  };
  const weekLabel =
    week.length > 0
      ? week.length > 1
        ? `${fmtShort(week[0]!.date)} – ${fmtShort(week[week.length - 1]!.date)}`
        : fmtShort(week[0]!.date)
      : "";

  if (state?.success) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center shadow-xl shadow-[var(--primary)]/10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[var(--success)]">
          <CheckCircle2 size={34} />
        </span>
        <h2 className="font-display mt-4 text-xl font-bold text-slate-900">Solicitação enviada!</h2>
        <p className="mt-1 text-sm text-slate-500">{state.success}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/app/agendamentos" className="btn-gradient">Ver meus agendamentos</Link>
          <Link href={`/p/${providerSlug}`} className="btn-outline">Voltar ao perfil</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto max-w-lg space-y-4">
      <input type="hidden" name="providerId" value={providerId} />
      {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}
      {quoteResponseId && <input type="hidden" name="quoteResponseId" value={quoteResponseId} />}
      <input type="hidden" name="scheduledAt" value={scheduledAt} />

      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}

      {/* Data */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="label mb-0">
            <CalendarDays size={14} className="mr-1 inline text-[var(--primary)]" /> Data
          </p>
          {weeks.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Semana anterior"
                title="Semana anterior"
                disabled={safeWeekIndex === 0}
                onClick={() => {
                  setWeekIndex(safeWeekIndex - 1);
                  setSelected(null);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95",
                  safeWeekIndex === 0
                    ? "cursor-not-allowed border-slate-100 text-slate-300"
                    : "border-[var(--border)] text-slate-600 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]",
                )}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[110px] text-center text-xs font-semibold text-slate-500">{weekLabel}</span>
              <button
                type="button"
                aria-label="Próxima semana"
                title="Próxima semana"
                disabled={safeWeekIndex >= weeks.length - 1}
                onClick={() => {
                  setWeekIndex(safeWeekIndex + 1);
                  setSelected(null);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95",
                  safeWeekIndex >= weeks.length - 1
                    ? "cursor-not-allowed border-slate-100 text-slate-300"
                    : "border-[var(--border)] text-slate-600 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]",
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {week.map((d, i) => {
            const absoluteIndex = safeWeekIndex * 7 + i;
            const date = new Date(`${d.date}T12:00:00`);
            const anyAvailable = d.slots.some((s) => s.available);
            const active = day?.date === d.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  setDayIndex(absoluteIndex);
                  setSelected(null);
                }}
                className={cn(
                  "flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-all duration-150 active:scale-95",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30"
                    : anyAvailable
                      ? "border-[var(--border)] bg-white text-slate-600 hover:border-[var(--primary)]/50"
                      : "border-[var(--border)] bg-slate-50 text-slate-300",
                )}
              >
                <span className="text-[10px] font-medium uppercase">{WEEKDAYS[date.getDay()].slice(0, 3)}</span>
                <span className="font-display text-lg font-extrabold leading-tight">{date.getDate()}</span>
                <span className="text-[10px]">
                  {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Horários */}
      <section className="card space-y-4 p-4">
        <p className="label mb-0">Horário disponível</p>
        {day && dayInWeek ? (
          <>
            <SlotGroup
              title="Manhã"
              slots={morning}
              selectedTime={selected?.date === day.date ? selected.time : null}
              onSelect={(time) => setSelected({ date: day.date, time })}
            />
            <SlotGroup
              title="Tarde"
              slots={afternoon}
              selectedTime={selected?.date === day.date ? selected.time : null}
              onSelect={(time) => setSelected({ date: day.date, time })}
            />
            {day.slots.every((s) => !s.available) && (
              <p className="text-xs text-slate-400">Nenhum horário livre neste dia. Escolha outra data.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">Selecione uma data.</p>
        )}
      </section>

      {/* Serviço */}
      <section className="card p-4">
        <p className="label mb-0">Serviço</p>
        <select name="serviceId" className="input mt-2">
          <option value="">Não especificar</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </section>

      {/* Local */}
      <section className="card p-4">
        <p className="label mb-0">
          <MapPin size={14} className="mr-1 inline text-[var(--primary)]" /> Local do serviço
        </p>
        <input name="addressText" required defaultValue={defaultAddress} className="input mt-2" placeholder="Ex: Rua das Flores, 100 - Centro" />
      </section>

      <button
        disabled={pending || !selected}
        className="btn-gradient w-full py-3.5 text-base"
      >
        {pending
          ? "Enviando..."
          : selected
            ? `Confirmar agendamento · ${selected.time}`
            : "Escolha um horário"}
      </button>
      <p className="pb-2 text-center text-xs text-slate-400">
        O profissional precisa confirmar. Você receberá uma notificação.
      </p>
    </form>
  );
}
