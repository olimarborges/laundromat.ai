import type { Check } from "./problems";

export type CompensationKind = "reliberacao" | "credito" | "estorno";

export type CheckResult = "confirmed" | "not_confirmed" | "unavailable";

export interface Verification {
  payment: CheckResult;
  machine_log: CheckResult;
  camera: CheckResult;
}

export interface CompensationPolicy {
  /** 1 = toda compensação passa pelo lojista; 2 = automática dentro dos limites. */
  pilotPhase: 1 | 2;
  maxPerCaseCents: number;
  maxPerCustomerPerDayCents: number;
  maxPerStorePerDayCents: number;
}

export const DEFAULT_POLICY: CompensationPolicy = {
  pilotPhase: 1,
  maxPerCaseCents: 2000,
  maxPerCustomerPerDayCents: 2000,
  maxPerStorePerDayCents: 6000,
};

export interface CompensationRequest {
  kind: CompensationKind;
  amountCents: number;
  verification: Verification;
  /** Conferências exigidas pelo tipo de problema. */
  requiredChecks: Check[];
  customerTodayCents: number;
  storeTodayCents: number;
  phoneVerified: boolean;
}

export type Decision =
  | { outcome: "auto_approve"; reasons: string[] }
  | { outcome: "needs_owner"; reasons: string[] }
  | { outcome: "deny"; reasons: string[] };

/**
 * Regra central: compensação só com a falha confirmada pelas conferências.
 * Fase 1 → sempre o lojista decide. Estorno → sempre o lojista.
 * O modelo de IA só propõe; quem decide é esta função.
 */
export function evaluateCompensation(
  req: CompensationRequest,
  policy: CompensationPolicy = DEFAULT_POLICY,
): Decision {
  const reasons: string[] = [];
  const required = req.requiredChecks.length > 0 ? req.requiredChecks : (["payment", "machine_log", "camera"] as Check[]);

  const failed = required.filter((c) => req.verification[c] === "not_confirmed");
  const unavailable = required.filter((c) => req.verification[c] === "unavailable");

  if (failed.length > 0) {
    return {
      outcome: "deny",
      reasons: [`Falha não confirmada por: ${failed.map(labelCheck).join(", ")}.`],
    };
  }
  if (unavailable.length > 0) {
    reasons.push(`Sem dados de: ${unavailable.map(labelCheck).join(", ")}; precisa de análise humana.`);
  }
  if (!req.phoneVerified) reasons.push("Celular do cliente ainda não confirmado por código.");
  if (req.kind === "estorno") reasons.push("Estorno no cartão/Pix sempre exige aprovação do lojista.");
  if (policy.pilotPhase === 1) reasons.push("Fase 1 do piloto: toda compensação passa pelo lojista.");
  if (req.amountCents > policy.maxPerCaseCents) reasons.push("Valor acima do limite por caso.");
  if (req.customerTodayCents + req.amountCents > policy.maxPerCustomerPerDayCents)
    reasons.push("Cliente atingiu o limite diário.");
  if (req.storeTodayCents + req.amountCents > policy.maxPerStorePerDayCents)
    reasons.push("Loja atingiu o limite diário de compensações automáticas.");

  if (reasons.length > 0) return { outcome: "needs_owner", reasons };
  return { outcome: "auto_approve", reasons: ["Falha confirmada pelas conferências e dentro dos limites."] };
}

export function labelCheck(c: Check): string {
  return c === "payment" ? "pagamento" : c === "machine_log" ? "registro da máquina" : "câmera";
}

export function labelKind(k: CompensationKind): string {
  return k === "reliberacao" ? "Liberar a lavagem de novo" : k === "credito" ? "Crédito para a próxima" : "Estorno";
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
