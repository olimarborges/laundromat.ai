import type { CheckResult } from "@/domain/compensation";
import type { MachineRow, PaymentRow, MachineEventRow, CameraSnapshotRow, TerminalRow } from "@/server/types";

/**
 * Contratos das integrações externas. Hoje: implementações simuladas (mock) sobre o Supabase.
 * Depois: Cicclo (API ou acesso autorizado), Stone, câmeras Intelbras e WhatsApp.
 */

export interface CheckOutcome<T> {
  status: CheckResult;
  /** Frase curta, legível pelo lojista e pelo cliente. */
  detail: string;
  data?: T;
}

/** Cicclo: estado das máquinas, registro e liberação. */
export interface CiccloGateway {
  listMachines(storeId: string): Promise<MachineRow[]>;
  getMachine(storeId: string, code: string): Promise<MachineRow | null>;
  recentEvents(storeId: string, machineId: string, minutes: number): Promise<MachineEventRow[]>;
  /** Confere no registro se a máquina falhou depois do pagamento. */
  checkMachineLog(storeId: string, machineId: string): Promise<CheckOutcome<MachineEventRow[]>>;
  /** Libera um ciclo sem cobrança (só após aprovação). */
  releaseMachine(storeId: string, machineId: string, reason: string): Promise<{ ok: boolean; detail: string }>;
}

/** Stone: pagamentos recentes e estado da maquininha. */
export interface PaymentGateway {
  recentPayments(storeId: string, opts: { machineId?: string; minutes: number }): Promise<PaymentRow[]>;
  checkPayment(storeId: string, machineId: string | null): Promise<CheckOutcome<PaymentRow[]>>;
  terminalStatus(storeId: string): Promise<TerminalRow | null>;
}

/** Câmeras: foto a cada 30 s, analisada fora da loja, rostos borrados. */
export interface CameraGateway {
  latestSnapshot(storeId: string, machineId: string): Promise<CameraSnapshotRow | null>;
  checkMachine(storeId: string, machineId: string, problem: string): Promise<CheckOutcome<CameraSnapshotRow>>;
}

export interface Integrations {
  cicclo: CiccloGateway;
  payments: PaymentGateway;
  camera: CameraGateway;
}
