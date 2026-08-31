import { and, eq, gte, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  blockedDates,
  providerAvailability,
} from "@/lib/schema";
import { brtDateString, brtDayOfWeek, brtMinutesOfDay } from "@/lib/tz";

export interface DaySlots {
  date: string; // yyyy-mm-dd
  weekday: number;
  slots: { time: string; available: boolean }[];
}

/** Solicitações pendentes expiram após 24h (não reservam o slot para sempre). */
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function minutesToHHMM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** Verifica se [aStart, aEnd) e [bStart, bEnd) se sobrepõem. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

interface BookedInterval {
  start: number; // epoch ms
  end: number; // epoch ms
}

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getBookedIntervals(
  database: DbLike,
  providerId: number,
  excludeAppointmentId?: number,
) {
  const staleCutoff = new Date(Date.now() - PENDING_TTL_MS);
  const conditions = [
    eq(appointments.providerId, providerId),
    // ativos = tudo exceto cancelados; solicitações pendentes com +24h não contam
    or(
      ne(appointments.status, "CANCELLED"),
      and(eq(appointments.status, "BOOKING_REQUESTED"), gte(appointments.createdAt, staleCutoff)),
    ),
  ];
  if (excludeAppointmentId != null) conditions.push(ne(appointments.id, excludeAppointmentId));

  const rows = await database
    .select({ scheduledAt: appointments.scheduledAt, duration: appointments.durationMinutes })
    .from(appointments)
    .where(and(...conditions));

  return rows.map<BookedInterval>((r) => ({
    start: r.scheduledAt.getTime(),
    end: r.scheduledAt.getTime() + r.duration * 60_000,
  }));
}

export async function getAvailableSlots(
  providerId: number,
  daysAhead = 14,
): Promise<DaySlots[]> {
  const [availability, blocked, booked] = await Promise.all([
    db
      .select()
      .from(providerAvailability)
      .where(
        and(
          eq(providerAvailability.providerId, providerId),
          eq(providerAvailability.isActive, true),
        ),
      ),
    db.select().from(blockedDates).where(eq(blockedDates.providerId, providerId)),
    getBookedIntervals(db, providerId),
  ]);

  const blockedSet = new Set(blocked.map((b) => b.date));

  const result: DaySlots[] = [];
  const now = new Date();
  const nowMs = now.getTime();

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const dayMs = nowMs + dayOffset * 24 * 60 * 60 * 1000;
    const dayBrt = new Date(dayMs);
    const dateStr = brtDateString(dayBrt);
    const weekday = brtDayOfWeek(dayBrt);
    if (blockedSet.has(dateStr)) continue;

    const dayRules = availability.filter((a) => a.weekday === weekday);
    if (dayRules.length === 0) continue;

    const slots: { time: string; available: boolean }[] = [];
    for (const rule of dayRules) {
      const slotMinutes = rule.slotMinutes ?? 120;
      if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) continue; // evita loop infinito
      const [sh, sm] = rule.startTime.split(":").map(Number);
      const [eh, em] = rule.endTime.split(":").map(Number);
      const start = sh! * 60 + sm!;
      const end = eh! * 60 + em!;
      for (let m = start; m + slotMinutes <= end; m += slotMinutes) {
        const time = minutesToHHMM(m);
        const slotDate = new Date(`${dateStr}T${time}:00-03:00`);
        const slotStartMs = slotDate.getTime();
        const slotEndMs = slotStartMs + slotMinutes * 60_000;
        const isPast = slotStartMs < nowMs;
        // conflito real: sobreposição com agendamento existente no mesmo dia
        const isBooked = booked.some(
          (b) =>
            brtDateString(new Date(b.start)) === dateStr &&
            overlaps(slotStartMs, slotEndMs, b.start, b.end),
        );
        slots.push({ time, available: !isPast && !isBooked });
      }
    }
    if (slots.length > 0) result.push({ date: dateStr, weekday, slots });
  }

  return result;
}

export interface SlotResolution {
  ok: boolean;
  /** Duração da janela casada (minutos) — deve ser usada como durationMinutes. */
  slotMinutes: number;
  reason?: "sem_disponibilidade" | "data_bloqueada" | "fora_da_janela" | "no_passado" | "conflito";
}

/**
 * Valida o slot iterando TODAS as janelas ativas do dia (não só a primeira)
 * e já devolve a duração correta do slot para persistir no agendamento.
 */
export async function resolveSlot(
  database: DbLike,
  providerId: number,
  scheduledAt: Date,
  excludeAppointmentId?: number,
): Promise<SlotResolution> {
  if (scheduledAt.getTime() <= Date.now()) {
    return { ok: false, slotMinutes: 0, reason: "no_passado" };
  }

  const rules = await database
    .select()
    .from(providerAvailability)
    .where(
      and(
        eq(providerAvailability.providerId, providerId),
        eq(providerAvailability.weekday, brtDayOfWeek(scheduledAt)),
        eq(providerAvailability.isActive, true),
      ),
    );
  if (rules.length === 0) return { ok: false, slotMinutes: 0, reason: "sem_disponibilidade" };

  const dateStr = brtDateString(scheduledAt);
  const blocked = await database
    .select({ id: blockedDates.id })
    .from(blockedDates)
    .where(and(eq(blockedDates.providerId, providerId), eq(blockedDates.date, dateStr)));
  if (blocked.length > 0) return { ok: false, slotMinutes: 0, reason: "data_bloqueada" };

  const minutes = brtMinutesOfDay(scheduledAt);
  const startMs = scheduledAt.getTime();

  for (const rule of rules) {
    const slotMinutes = rule.slotMinutes ?? 120;
    if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) continue;
    const [sh, sm] = rule.startTime.split(":").map(Number);
    const [eh, em] = rule.endTime.split(":").map(Number);
    const windowStart = sh! * 60 + sm!;
    const windowEnd = eh! * 60 + em!;
    if (minutes < windowStart || minutes + slotMinutes > windowEnd) continue;

    const slotEnd = startMs + slotMinutes * 60_000;
    const booked = await getBookedIntervals(database, providerId, excludeAppointmentId);
    const conflict = booked.some((b) => overlaps(startMs, slotEnd, b.start, b.end));
    if (conflict) continue;

    return { ok: true, slotMinutes };
  }
  return { ok: false, slotMinutes: 0, reason: "fora_da_janela" };
}

/** Compat: valida o slot (agora iterando todas as janelas do dia). */
export async function isSlotAvailable(
  providerId: number,
  scheduledAt: Date,
  excludeAppointmentId?: number,
): Promise<boolean> {
  const res = await resolveSlot(db, providerId, scheduledAt, excludeAppointmentId);
  if (res.ok) return true;
  return false;
}
