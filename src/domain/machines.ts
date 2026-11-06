export type MachineKind = "washer" | "dryer";
export type MachineStatus = "free" | "released" | "running" | "finished" | "error" | "offline";

export interface MachineLike {
  kind: MachineKind;
  status: MachineStatus;
  cycle_ends_at: string | null;
}

/** Estado efetivo: ciclo "running" com término no passado vira "finished". */
export function effectiveStatus(m: MachineLike, now: Date): MachineStatus {
  if (m.status === "running" && m.cycle_ends_at && new Date(m.cycle_ends_at).getTime() <= now.getTime()) {
    return "finished";
  }
  return m.status;
}

export function minutesLeft(m: MachineLike, now: Date): number | null {
  if (m.status !== "running" || !m.cycle_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(m.cycle_ends_at).getTime() - now.getTime()) / 60_000));
}

export const STATUS_LABEL: Record<MachineStatus, string> = {
  free: "Livre",
  released: "Liberada",
  running: "Em uso",
  finished: "Ciclo terminou",
  error: "Com erro",
  offline: "Sem conexão",
};

export const KIND_LABEL: Record<MachineKind, string> = {
  washer: "Lavadora",
  dryer: "Secadora",
};

/** Disponível para o próximo cliente? (para a tela "máquinas livres"). */
export function isAvailable(m: MachineLike, now: Date): boolean {
  return effectiveStatus(m, now) === "free";
}
