"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  Lock,
  Settings2,
  Timer,
} from "lucide-react";
import { AppointmentActions } from "@/components/appointment-actions";
import { BlockedDateManager } from "@/components/blocked-date-manager";
import { EmptyState, StatusBadge } from "@/components/ui";
import { APPOINTMENT_STATUS_LABEL, WEEKDAYS } from "@/lib/utils";
import { brtDateString } from "@/lib/tz";

export interface AgendaEvent {
  id: number;
  scheduledAt: string; // ISO
  durationMinutes: number;
  status: string;
  customerName: string;
  serviceName: string | null;
  addressText: string | null;
}

export interface AgendaWorkspaceProps {
  slug: string;
  appointments: AgendaEvent[];
  rules: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[];
  slots: { date: string; weekday: number; slots: { time: string; available: boolean }[] }[];
  blocked: { id: number; date: string; reason: string | null }[];
}

const HOUR_PX = 64;

/** Grupos de status exibidos no calendário (cancelados não aparecem). */
const GROUPS = [
  { id: "solicitacoes", label: "Solicitações", statuses: ["BOOKING_REQUESTED"], dot: "bg-amber-400" },
  { id: "confirmados", label: "Serviços confirmados", statuses: ["BOOKING_CONFIRMED"], dot: "bg-indigo-500" },
  { id: "andamento", label: "Em andamento", statuses: ["ON_THE_WAY", "IN_PROGRESS"], dot: "bg-sky-500" },
  { id: "concluidos", label: "Concluídos", statuses: ["COMPLETED"], dot: "bg-emerald-500" },
] as const;

function statusStyle(status: string): string {
  switch (status) {
    case "BOOKING_REQUESTED": return "border-l-amber-400 bg-amber-50/90 text-amber-800";
    case "BOOKING_CONFIRMED": return "border-l-indigo-500 bg-indigo-50/90 text-indigo-900";
    case "ON_THE_WAY":
    case "IN_PROGRESS": return "border-l-sky-500 bg-sky-50/90 text-sky-900";
    case "COMPLETED": return "border-l-emerald-500 bg-emerald-50/90 text-emerald-900";
    default: return "border-l-slate-400 bg-slate-50/90 text-slate-700";
  }
}

function minutesToHHMM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function AgendaWorkspace({ appointments, rules, slots, blocked }: AgendaWorkspaceProps) {
  const todayStr = brtDateString(new Date());
  const [tab, setTab] = useState<"agenda" | "disponibilidade" | "livres">("agenda");
  const [refDay, setRefDay] = useState<string>(todayStr); // qualquer dia da semana exibida
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date(`${todayStr}T12:00:00-03:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showFilters, setShowFilters] = useState(true);
  const [enabledGroups, setEnabledGroups] = useState<string[]>(GROUPS.map((g) => g.id));

  const events = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        scheduled: new Date(a.scheduledAt),
        dateStr: brtDateString(new Date(a.scheduledAt)),
      })),
    [appointments],
  );

  const activeStatuses = useMemo(
    () => new Set<string>(GROUPS.filter((g) => enabledGroups.includes(g.id)).flatMap((g) => g.statuses)),
    [enabledGroups],
  );

  // ── semana exibida (domingo → sábado, dias no fuso de Brasília) ──
  const weekDays = useMemo(() => {
    const base = new Date(`${refDay}T12:00:00Z`); // meio-dia UTC = meio-dia BRT neutro
    const sundayOffset = -base.getUTCDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getTime() + (sundayOffset + i) * 24 * 3600_000);
      const dateStr = d.toISOString().slice(0, 10);
      return { dateStr, weekday: d.getUTCDay(), dayNum: d.getUTCDate(), monthNum: d.getUTCMonth() };
    });
  }, [refDay]);

  const shiftWeek = (dir: 1 | -1) => {
    const d = new Date(`${refDay}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dir * 7);
    setRefDay(d.toISOString().slice(0, 10));
  };

  const weekTitle = useMemo(() => {
    const first = weekDays[0]!;
    const last = weekDays[6]!;
    const f = new Date(`${first.dateStr}T12:00:00-03:00`);
    const l = new Date(`${last.dateStr}T12:00:00-03:00`);
    if (first.monthNum === last.monthNum) {
      return `${f.getDate()} a ${l.getDate()} de ${MONTHS[l.getMonth()]} de ${l.getFullYear()}`;
    }
    return `${f.getDate()} de ${MONTHS[f.getMonth()]} a ${l.getDate()} de ${MONTHS[l.getMonth()]} de ${l.getFullYear()}`;
  }, [weekDays]);

  const inWeekDates = useMemo(() => new Set(weekDays.map((d) => d.dateStr)), [weekDays]);

  const weekEvents = useMemo(
    () =>
      events
        .filter((e) => inWeekDates.has(e.dateStr) && activeStatuses.has(e.status))
        .sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime()),
    [events, inWeekDates, activeStatuses],
  );

  // faixa de horas SOMENTE com base nos compromissos da semana
  // (a aba "Horários livres" cobre a disponibilidade — aqui é agendamento, não vazio)
  const { rangeStart, rangeEnd, hours, hasEvents } = useMemo(() => {
    if (weekEvents.length === 0) {
      return { rangeStart: 0, rangeEnd: 0, hours: [] as number[], hasEvents: false };
    }
    let start = Infinity;
    let end = 0;
    for (const e of weekEvents) {
      const mins = e.scheduled.getHours() * 60 + e.scheduled.getMinutes();
      start = Math.min(start, Math.floor(mins / 60) * 60);
      end = Math.max(end, Math.ceil((mins + e.durationMinutes) / 60) * 60);
    }
    // janela mínima de 2h para o evento respirar
    if (end - start < 120) end = Math.min(start + 120, 24 * 60);
    const list: number[] = [];
    for (let m = start; m <= end; m += 60) list.push(m);
    return { rangeStart: start, rangeEnd: end, hours: list, hasEvents: true };
  }, [weekEvents]);

  const gridHeight = (rangeEnd - rangeStart) * (HOUR_PX / 60);

  // eventos por dia com lanes anti-sobreposição
  const byDay = useMemo(() => {
    type CalEvent = AgendaEvent & {
      scheduled: Date;
      dateStr: string;
      start: number;
      end: number;
      lane: number;
      lanes: number;
    };
    const map = new Map<string, CalEvent[]>();
    for (const day of weekDays) {
      const dayEvents = weekEvents.filter((e) => e.dateStr === day.dateStr);
      // atribui lanes (greedy)
      const lanesEnd: number[] = [];
      const withLanes = dayEvents.map((e) => {
        const start = e.scheduled.getHours() * 60 + e.scheduled.getMinutes();
        const end = start + e.durationMinutes;
        let lane = lanesEnd.findIndex((laneEnd) => laneEnd <= start);
        if (lane === -1) {
          lane = lanesEnd.length;
          lanesEnd.push(end);
        } else {
          lanesEnd[lane] = end;
        }
        return { ...e, start, end, lane };
      });
      // total de lanes por evento = máximo entre vizinhos que sobrepõem
      const result: CalEvent[] = withLanes.map((e) => {
        const overlapping = withLanes.filter((o) => o.start < e.end && e.start < o.end);
        const lanes = Math.max(overlapping.length, ...overlapping.map((o) => o.lane + 1), e.lane + 1);
        return { ...e, lanes };
      });
      map.set(day.dateStr, result);
    }
    return map;
  }, [weekDays, weekEvents]);

  // linha do "agora"
  const nowLine = useMemo(() => {
    const now = new Date();
    const todayInWeek = weekDays.find((d) => d.dateStr === todayStr);
    if (!todayInWeek) return null;
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < rangeStart || mins > rangeEnd) return null;
    return { day: todayInWeek, top: ((mins - rangeStart) * HOUR_PX) / 60, label: minutesToHHMM(mins) };
  }, [weekDays, todayStr, rangeStart, rangeEnd]);

  // ── mini calendário ──
  const monthGrid = useMemo(() => {
    const first = new Date(Date.UTC(monthCursor.year, monthCursor.month, 1));
    const startOffset = first.getUTCDay(); // domingo = 0
    const daysInMonth = new Date(Date.UTC(monthCursor.year, monthCursor.month + 1, 0)).getUTCDate();
    const cells: { dateStr: string; dayNum: number; inMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(monthCursor.year, monthCursor.month, -i));
      cells.push({ dateStr: d.toISOString().slice(0, 10), dayNum: d.getUTCDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthCursor.year}-${String(monthCursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ dateStr, dayNum: d, inMonth: true });
    }
    while (cells.length < 42) {
      const last = cells[cells.length - 1]!;
      const d = new Date(`${last.dateStr}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      cells.push({ dateStr: d.toISOString().slice(0, 10), dayNum: d.getUTCDate(), inMonth: false });
    }
    return cells;
  }, [monthCursor]);

  const apptCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.status === "CANCELLED") continue;
      map.set(e.dateStr, (map.get(e.dateStr) ?? 0) + 1);
    }
    return map;
  }, [events]);

  // ── resumo do dia (hoje) ──
  const summary = useMemo(() => {
    const todays = events.filter((e) => e.dateStr === todayStr && e.status !== "CANCELLED");
    const totalMin = todays.reduce((sum, e) => sum + e.durationMinutes, 0);
    return {
      count: todays.length,
      total: `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, "0")}m`,
      pending: todays.filter((e) => e.status === "BOOKING_REQUESTED").length,
    };
  }, [events, todayStr]);

  const pending = useMemo(
    () =>
      events
        .filter((e) => e.status === "BOOKING_REQUESTED")
        .sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime()),
    [events],
  );

  const jumpTo = (dateStr: string) => {
    setRefDay(dateStr);
    const d = new Date(`${dateStr}T12:00:00Z`);
    setMonthCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setTab("agenda");
  };

  return (
    <div className="space-y-5">
      {/* ── Abas + ações ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
          {(
            [
              { id: "agenda", label: "Agenda", icon: <CalendarDays size={16} /> },
              { id: "disponibilidade", label: "Disponibilidade", icon: <Clock size={16} /> },
              { id: "livres", label: "Horários livres", icon: <Timer size={16} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/prestador/perfil" className="btn-outline px-4 py-2 text-xs">
            <Settings2 size={14} /> Configurações de agenda
          </Link>
        </div>
      </div>

      {/* ── Pendências no topo (sempre visíveis) ── */}
      {pending.length > 0 && tab === "agenda" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <Inbox size={15} /> {pending.length} solicitação(ões) aguardando sua confirmação
          </h3>
          <ul className="mt-3 space-y-2.5">
            {pending.map((a) => (
              <li key={a.id} className="card border-amber-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{a.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {a.serviceName ? ` · ${a.serviceName}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                </div>
                <AppointmentActions appointmentId={a.id} status={a.status} role="PROVIDER" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "agenda" && (
        <div className="grid gap-4 lg:grid-cols-[264px_1fr]">
          {/* ── Sidebar ── */}
          <aside className={`space-y-4 ${showFilters ? "" : "hidden lg:block"}`}>
            {/* mini calendário */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">
                  {MONTHS[monthCursor.month]} {monthCursor.year}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setMonthCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))
                    }
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setMonthCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))
                    }
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px]">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <span key={i} className="font-semibold text-slate-400">{d}</span>
                ))}
                {monthGrid.map((cell, i) => {
                  const isToday = cell.dateStr === todayStr;
                  const isRef = cell.dateStr === refDay;
                  const hasAppts = (apptCountByDate.get(cell.dateStr) ?? 0) > 0;
                  return (
                    <button
                      key={i}
                      onClick={() => jumpTo(cell.dateStr)}
                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${
                        isToday
                          ? "bg-[var(--primary)] font-bold text-white"
                          : isRef
                            ? "bg-[var(--primary)]/10 font-bold text-[var(--primary)]"
                            : cell.inMonth
                              ? `text-slate-600 hover:bg-slate-100 ${hasAppts ? "font-bold text-[var(--primary)]" : ""}`
                              : "text-slate-300"
                      }`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* filtros */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Filtros</h3>
                <button
                  onClick={() => setEnabledGroups(GROUPS.map((g) => g.id))}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Limpar
                </button>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Tipos de compromisso
              </p>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={enabledGroups.length === GROUPS.length}
                      onChange={(e) =>
                        setEnabledGroups(e.target.checked ? GROUPS.map((g) => g.id) : [])
                      }
                      className="h-3.5 w-3.5 accent-[var(--primary)]"
                    />
                    <span className="font-medium text-slate-700">Todos</span>
                  </label>
                </li>
                {GROUPS.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={enabledGroups.includes(g.id)}
                        onChange={(e) =>
                          setEnabledGroups((prev) =>
                            e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id),
                          )
                        }
                        className="h-3.5 w-3.5 accent-[var(--primary)]"
                      />
                      <span className="flex-1 text-slate-600">{g.label}</span>
                      <span className={`h-2 w-2 rounded-full ${g.dot}`} aria-hidden />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* resumo do dia */}
            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-800">Resumo do dia</h3>
              <p className="text-xs text-slate-400">
                {new Date(`${todayStr}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5">
                  <CalendarDays size={16} className="text-[var(--primary)]" />
                  <b className="text-slate-800">{summary.count}</b>
                  <span className="text-slate-500">Compromissos</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock size={16} className="text-[var(--primary)]" />
                  <b className="text-slate-800">{summary.total}</b>
                  <span className="text-slate-500">Tempo total</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-amber-500" />
                  <b className="text-slate-800">{summary.pending}</b>
                  <span className="text-slate-500">Pendentes</span>
                </li>
              </ul>
            </div>
          </aside>

          {/* ── Grade semanal ── */}
          <div className="card p-4">
            {/* controles */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setRefDay(todayStr)} className="btn-outline px-4 py-2 text-xs">
                  Hoje
                </button>
                <button
                  onClick={() => shiftWeek(-1)}
                  className="rounded-xl border border-[var(--border)] bg-white p-2 text-slate-500 hover:text-[var(--primary)]"
                  aria-label="Semana anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => shiftWeek(1)}
                  className="rounded-xl border border-[var(--border)] bg-white p-2 text-slate-500 hover:text-[var(--primary)]"
                  aria-label="Próxima semana"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <p className="font-display text-base font-bold text-slate-900 sm:text-lg">{weekTitle}</p>
              <div className="flex items-center gap-2">
                {hasEvents && (
                  <span className="hidden rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--primary-dark)] lg:inline-flex">
                    {weekEvents.length} compromisso(s)
                  </span>
                )}
                <span className="hidden rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-medium text-slate-500 sm:inline-flex">
                  Semana
                </span>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`rounded-xl border p-2 transition lg:hidden ${
                    showFilters
                      ? "border-[var(--primary)] text-[var(--primary)]"
                      : "border-[var(--border)] text-slate-500"
                  }`}
                  aria-label="Mostrar filtros"
                >
                  <Filter size={16} />
                </button>
              </div>
            </div>

            {/* grade (só quando há compromissos na semana) */}
            {!hasEvents ? (
              <div className="mt-4">
                <EmptyState
                  icon={<CalendarDays size={22} />}
                  title="Nenhum compromisso nesta semana"
                  description="Navegue para outras semanas ou confira a aba “Horários livres” para ver sua disponibilidade."
                />
              </div>
            ) : (
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="min-w-[720px]">
                {/* cabeçalho dos dias */}
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
                  <span />
                  {weekDays.map((d) => {
                    const isToday = d.dateStr === todayStr;
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => jumpTo(d.dateStr)}
                        className={`border-l border-slate-100 pb-2 text-center transition ${
                          isToday ? "text-[var(--primary)]" : "text-slate-600"
                        }`}
                      >
                        <span className="block text-xs font-bold">
                          {WEEKDAYS[d.weekday].slice(0, 3)} {d.dayNum}
                        </span>
                        <span className={`block text-[10px] ${isToday ? "text-[var(--primary)]" : "text-slate-400"}`}>
                          {MONTHS[d.monthNum].slice(0, 3)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* corpo */}
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
                  {/* eixo de horas */}
                  <div className="relative" style={{ height: gridHeight }}>
                    {hours.map((m, i) => (
                      <span
                        key={m}
                        className={`absolute right-2 text-[10px] font-medium text-slate-400 ${
                          i === 0 ? "translate-y-0" : "-translate-y-1/2"
                        }`}
                        style={{ top: ((m - rangeStart) * HOUR_PX) / 60 }}
                      >
                        {minutesToHHMM(m)}
                      </span>
                    ))}
                  </div>

                  {weekDays.map((day) => {
                    const isToday = day.dateStr === todayStr;
                    const dayEvents = byDay.get(day.dateStr) ?? [];
                    return (
                      <div
                        key={day.dateStr}
                        className={`relative border-l border-slate-100 ${isToday ? "bg-[var(--primary-soft)]/30" : ""}`}
                        style={{ height: gridHeight }}
                      >
                        {/* linhas de hora */}
                        {hours.map((m) => (
                          <span
                            key={m}
                            className="absolute left-0 right-0 border-t border-slate-100"
                            style={{ top: ((m - rangeStart) * HOUR_PX) / 60 }}
                          />
                        ))}

                        {/* eventos */}
                        {dayEvents.map((e) => {
                          const top = ((e.start - rangeStart) * HOUR_PX) / 60;
                          const height = Math.max((e.end - e.start) * (HOUR_PX / 60) - 4, 30);
                          const widthPct = 100 / e.lanes;
                          return (
                            <div
                              key={e.id}
                              title={`${e.customerName} · ${e.serviceName ?? "Serviço"}\n${minutesToHHMM(e.start)}–${minutesToHHMM(e.end)}${e.addressText ? `\n📍 ${e.addressText}` : ""}`}
                              className={`absolute z-10 cursor-pointer overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 shadow-sm transition-all duration-200 hover:z-20 hover:shadow-lg ${statusStyle(e.status)}`}
                              style={{
                                top: top + 1,
                                height,
                                left: `calc(${e.lane * widthPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                              }}
                            >
                              <p className="truncate text-[10px] font-bold leading-tight">
                                {minutesToHHMM(e.start)}
                              </p>
                              <p className="truncate text-[10px] font-semibold leading-tight">{e.customerName}</p>
                              {height > 46 && (
                                <p className="truncate text-[9px] leading-tight opacity-80">
                                  {e.serviceName ?? "Serviço"}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {/* linha do agora */}
                        {nowLine?.day.dateStr === day.dateStr && (
                          <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: nowLine.top }}>
                            <span className="absolute -left-1 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                            <span className="absolute left-0 right-0 border-t-2 border-red-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle size={13} className="text-[var(--primary)]" />
              A grade mostra apenas os horários agendados. Disponibilidade livre fica na aba “Horários livres”.
            </p>
          </div>
        </div>
      )}

      {tab === "disponibilidade" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-display text-base font-bold text-slate-900">Agenda semanal</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Janelas de atendimento usadas para gerar os horários dos clientes.
            </p>
            {rules.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                Nenhuma disponibilidade configurada.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {rules.map((r) => (
                  <li key={r.weekday} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-semibold text-slate-700">{WEEKDAYS[r.weekday]}</span>
                    <span className="text-slate-500">
                      {r.startTime} – {r.endTime} · {r.slotMinutes} min/slot
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/prestador/perfil" className="btn-primary mt-4 w-full text-sm">
              Editar disponibilidade
            </Link>
          </div>

          <div>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                <Lock size={15} className="text-[var(--primary)]" /> Datas bloqueadas
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">Férias, folgas ou compromissos pontuais.</p>
            </div>
            <div className="mt-3">
              <BlockedDateManager blocked={blocked} today={todayStr} />
            </div>
          </div>
        </div>
      )}

      {tab === "livres" && (
        <div className="card p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Horários livres (7 dias)</h3>
          <p className="mt-0.5 text-xs text-slate-500">O que os clientes veem disponível para agendar.</p>
          {slots.length === 0 || slots.every((d) => d.slots.every((s) => !s.available)) ? (
            <EmptyState
              icon={<CalendarDays size={20} />}
              title="Nenhum horário livre nos próximos 7 dias"
              description="Configure sua disponibilidade ou libere datas bloqueadas."
            />
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((d) => {
                const free = d.slots.filter((s) => s.available).length;
                return (
                  <div key={d.date} className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {WEEKDAYS[d.weekday]} — {new Date(`${d.date}T12:00:00-03:00`).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-xs text-slate-400">{free} horário(s) livre(s)</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
