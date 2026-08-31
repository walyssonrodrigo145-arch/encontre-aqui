/**
 * Fuso de Brasília (UTC-3, sem horário de verão desde 2019).
 * Centraliza toda leitura de "data local" para evitar mistura UTC × servidor.
 */
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

/** Data deslocada para que getters UTC correspondam ao horário de Brasília. */
export function toBrt(d: Date): Date {
  return new Date(d.getTime() + BRT_OFFSET_MS);
}

/** "yyyy-mm-dd" no fuso de Brasília. */
export function brtDateString(d: Date): string {
  return toBrt(d).toISOString().slice(0, 10);
}

/** Dia da semana (0=dom .. 6=sáb) em Brasília. */
export function brtDayOfWeek(d: Date): number {
  return toBrt(d).getUTCDay();
}

/** Minutos desde a meia-noite em Brasília. */
export function brtMinutesOfDay(d: Date): number {
  const t = toBrt(d);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

/** Interpreta "yyyy-mm-ddTHH:mm[:ss]" (sem timezone) como horário de Brasília. */
export function parseBrtLocal(v: string): Date {
  const s = v.trim();
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  return new Date(hasTz ? s : `${s}-03:00`);
}

/** "HH:MM" a partir de uma data, em Brasília. */
export function brtHHMM(d: Date): string {
  const t = toBrt(d);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}
