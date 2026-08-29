import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  blockedDates,
  providerAvailability,
} from "@/lib/schema";

export interface DaySlots {
  date: string; // yyyy-mm-dd
  weekday: number;
  slots: { time: string; available: boolean }[];
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function minutesToHHMM(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** Verifica se [aStart, aEnd) e [bStart, bEnd) se sobrepõem. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

interface BookedInterval {
  start: Date;
  end: Date;
}

async function getBookedIntervals(providerId: number, excludeAppointmentId?: number) {
  const conditions = [eq(appointments.providerId, providerId), ne(appointments.status, "CANCELLED")];
  if (excludeAppointmentId != null) conditions.push(ne(appointments.id, excludeAppointmentId));

  const rows = await db
    .select({ scheduledAt: appointments.scheduledAt, duration: appointments.durationMinutes })
    .from(appointments)
    .where(and(...conditions));

  return rows.map<BookedInterval>((r) => ({
    start: r.scheduledAt,
    end: new Date(r.scheduledAt.getTime() + r.duration * 60_000),
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
    getBookedIntervals(providerId),
  ]);

  const blockedSet = new Set(blocked.map((b) => b.date));

  const result: DaySlots[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const dateStr = toDateString(day);
    const weekday = day.getDay();
    if (blockedSet.has(dateStr)) continue;

    const dayRules = availability.filter((a) => a.weekday === weekday);
    if (dayRules.length === 0) continue;

    const slots: { time: string; available: boolean }[] = [];
    for (const rule of dayRules) {
      const [sh, sm] = rule.startTime.split(":").map(Number);
      const [eh, em] = rule.endTime.split(":").map(Number);
      const start = sh! * 60 + sm!;
      const end = eh! * 60 + em!;
      for (let m = start; m + rule.slotMinutes <= end; m += rule.slotMinutes) {
        const time = minutesToHHMM(m);
        const slotDate = new Date(day);
        slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
        const slotEnd = new Date(slotDate.getTime() + rule.slotMinutes * 60_000);
        const isPast = slotDate.getTime() < now.getTime();
        // conflito real: sobreposição com agendamento existente no mesmo dia
        const isBooked = booked.some(
          (b) =>
            toDateString(b.start) === dateStr &&
            overlaps(slotDate.getTime(), slotEnd.getTime(), b.start.getTime(), b.end.getTime()),
        );
        slots.push({ time, available: !isPast && !isBooked });
      }
    }
    if (slots.length > 0) result.push({ date: dateStr, weekday, slots });
  }

  return result;
}

export async function isSlotAvailable(
  providerId: number,
  scheduledAt: Date,
  excludeAppointmentId?: number,
): Promise<boolean> {
  const weekday = scheduledAt.getDay();
  const [rule] = await db
    .select()
    .from(providerAvailability)
    .where(
      and(
        eq(providerAvailability.providerId, providerId),
        eq(providerAvailability.weekday, weekday),
        eq(providerAvailability.isActive, true),
      ),
    )
    .limit(1);
  if (!rule) return false;

  const minutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const [sh, sm] = rule.startTime.split(":").map(Number);
  const [eh, em] = rule.endTime.split(":").map(Number);
  const start = sh! * 60 + sm!;
  const end = eh! * 60 + em!;
  if (minutes < start || minutes + rule.slotMinutes > end) return false;

  const dateStr = toDateString(scheduledAt);
  const blocked = await db
    .select({ id: blockedDates.id })
    .from(blockedDates)
    .where(and(eq(blockedDates.providerId, providerId), eq(blockedDates.date, dateStr)));
  if (blocked.length > 0) return false;

  // conflito = qualquer agendamento ativo cujo intervalo se sobreponha ao slot
  const booked = await getBookedIntervals(providerId, excludeAppointmentId);
  const slotEnd = scheduledAt.getTime() + rule.slotMinutes * 60_000;
  return !booked.some((b) =>
    overlaps(scheduledAt.getTime(), slotEnd, b.start.getTime(), b.end.getTime()),
  );
}
