import { DEFAULT_TZ, minutesOfDay } from "./time";

export type Priority = "critical" | "normal";

/** Horários preferidos do lojista (resposta na seção 10 da proposta). */
export const DEFAULT_NOTIFY_HOURS = [8, 11, 13, 18, 20];

/**
 * Quando avisar o lojista: crítico → agora; normal → próximo horário do lote.
 * Retorna o instante (UTC) do próximo aviso.
 */
export function nextNotificationAt(
  now: Date,
  priority: Priority,
  notifyHours: number[] = DEFAULT_NOTIFY_HOURS,
  timeZone = DEFAULT_TZ,
): Date {
  if (priority === "critical" || notifyHours.length === 0) return now;
  const sorted = [...notifyHours].sort((a, b) => a - b);
  const t = minutesOfDay(now, timeZone);
  const nextHour = sorted.find((h) => h * 60 > t);
  const deltaMinutes = nextHour !== undefined ? nextHour * 60 - t : 1440 - t + sorted[0] * 60;
  const next = new Date(now.getTime() + deltaMinutes * 60_000);
  next.setUTCSeconds(0, 0);
  return next;
}

/** Rótulo do lote ("às 18h", "amanhã às 8h"). */
export function describeSlot(now: Date, slot: Date, timeZone = DEFAULT_TZ): string {
  if (slot.getTime() <= now.getTime() + 30_000) return "agora";
  const t = minutesOfDay(slot, timeZone);
  const sameDay =
    slot.getTime() - now.getTime() < 24 * 3600_000 && minutesOfDay(now, timeZone) < t;
  const hour = Math.floor(t / 60);
  return sameDay ? `às ${hour}h` : `amanhã às ${hour}h`;
}
