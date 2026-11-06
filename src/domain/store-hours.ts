import { DEFAULT_TZ, formatHourShort, minutesOfDay, parseHHMM } from "./time";

export interface StoreHours {
  openTime: string; // "06:00"
  closeTime: string; // "23:00"
  timeZone?: string;
  /** Minutos antes do fechamento em que começamos a avisar. */
  closingWarningMinutes?: number;
}

export type StoreState = "open" | "closing_soon" | "closed";

export interface StoreStatus {
  state: StoreState;
  isOpen: boolean;
  /** Minutos até fechar (só quando aberta). */
  minutesToClose: number | null;
  /** Minutos até abrir (só quando fechada). */
  minutesToOpen: number | null;
  label: string;
  detail: string;
}

export const EASYWASH_HOURS: StoreHours = {
  openTime: "06:00",
  closeTime: "23:00",
  timeZone: DEFAULT_TZ,
  closingWarningMinutes: 60,
};

export function getStoreStatus(now: Date, hours: StoreHours): StoreStatus {
  const tz = hours.timeZone ?? DEFAULT_TZ;
  const open = parseHHMM(hours.openTime);
  const close = parseHHMM(hours.closeTime);
  const warn = hours.closingWarningMinutes ?? 60;
  const t = minutesOfDay(now, tz);

  // Suporta horários que atravessam a meia-noite (ex.: 08:00–02:00).
  const crossesMidnight = close <= open;
  const isOpen = crossesMidnight ? t >= open || t < close : t >= open && t < close;

  if (isOpen) {
    const minutesToClose = crossesMidnight && t >= open ? 1440 - t + close : close - t;
    const closingSoon = minutesToClose <= warn;
    return {
      state: closingSoon ? "closing_soon" : "open",
      isOpen: true,
      minutesToClose,
      minutesToOpen: null,
      label: closingSoon ? "Fechando em breve" : "Aberta agora",
      detail: closingSoon
        ? `A porta tranca às ${formatHourShort(close)} (em ${minutesToClose} min)`
        : `Aberta até as ${formatHourShort(close)}`,
    };
  }

  const minutesToOpen = t < open ? open - t : 1440 - t + open;
  return {
    state: "closed",
    isOpen: false,
    minutesToClose: null,
    minutesToOpen,
    label: "Fechada",
    detail: `Abre às ${formatHourShort(open)}`,
  };
}

export interface CycleFit {
  fits: boolean;
  /** Minutos de folga (negativo = passa do fechamento). */
  slackMinutes: number | null;
  message: string | null;
}

/**
 * O ciclo escolhido termina antes de a porta trancar?
 * Considera uma margem para o cliente retirar as roupas.
 */
export function cycleFitsBeforeClose(
  now: Date,
  cycleMinutes: number,
  hours: StoreHours,
  pickupMarginMinutes = 10,
): CycleFit {
  const status = getStoreStatus(now, hours);
  if (!status.isOpen || status.minutesToClose === null) {
    return { fits: false, slackMinutes: null, message: "A loja está fechada agora." };
  }
  const slack = status.minutesToClose - (cycleMinutes + pickupMarginMinutes);
  if (slack >= 0) return { fits: true, slackMinutes: slack, message: null };
  return {
    fits: false,
    slackMinutes: slack,
    message: `Esse ciclo leva ${cycleMinutes} min e a porta tranca em ${status.minutesToClose} min. Suas roupas podem ficar presas até a abertura.`,
  };
}
