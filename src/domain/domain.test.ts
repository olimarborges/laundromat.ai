import { describe, expect, it } from "vitest";
import { cycleFitsBeforeClose, EASYWASH_HOURS, getStoreStatus } from "./store-hours";
import { describeSlot, nextNotificationAt } from "./notifications";
import { evaluateCompensation, DEFAULT_POLICY, type Verification } from "./compensation";
import { PROBLEM_LIST, PROBLEMS, isProblemType } from "./problems";

// São Paulo = UTC-3 (sem horário de verão desde 2019).
const sp = (hhmm: string, day = "2026-11-05") => new Date(`${day}T${hhmm}:00-03:00`);

describe("horário da loja (6h–23h)", () => {
  it("fechada antes das 6h", () => {
    const s = getStoreStatus(sp("05:30"), EASYWASH_HOURS);
    expect(s.state).toBe("closed");
    expect(s.minutesToOpen).toBe(30);
  });
  it("aberta no meio do dia", () => {
    const s = getStoreStatus(sp("14:00"), EASYWASH_HOURS);
    expect(s.state).toBe("open");
    expect(s.minutesToClose).toBe(540);
  });
  it("fechando em breve na última hora", () => {
    const s = getStoreStatus(sp("22:15"), EASYWASH_HOURS);
    expect(s.state).toBe("closing_soon");
    expect(s.minutesToClose).toBe(45);
  });
  it("fechada às 23h em ponto", () => {
    expect(getStoreStatus(sp("23:00"), EASYWASH_HOURS).state).toBe("closed");
  });
  it("suporta horário que atravessa a meia-noite", () => {
    const h = { openTime: "08:00", closeTime: "02:00" };
    expect(getStoreStatus(sp("01:00"), h).isOpen).toBe(true);
    expect(getStoreStatus(sp("03:00"), h).isOpen).toBe(false);
  });
});

describe("ciclo termina antes de fechar?", () => {
  it("cabe com folga", () => {
    expect(cycleFitsBeforeClose(sp("20:00"), 45, EASYWASH_HOURS).fits).toBe(true);
  });
  it("não cabe perto das 23h", () => {
    const fit = cycleFitsBeforeClose(sp("22:20"), 45, EASYWASH_HOURS);
    expect(fit.fits).toBe(false);
    expect(fit.message).toContain("porta tranca");
  });
});

describe("janelas de aviso ao lojista (8, 11, 13, 18, 20)", () => {
  it("crítico vai na hora", () => {
    const now = sp("09:10");
    expect(nextNotificationAt(now, "critical").getTime()).toBe(now.getTime());
  });
  it("normal vai para o próximo horário", () => {
    const next = nextNotificationAt(sp("09:10"), "normal");
    expect(next.toISOString()).toBe(sp("11:00").toISOString());
    expect(describeSlot(sp("09:10"), next)).toBe("às 11h");
  });
  it("depois das 20h vai para amanhã às 8h", () => {
    const next = nextNotificationAt(sp("21:30"), "normal");
    expect(next.toISOString()).toBe(sp("08:00", "2026-11-06").toISOString());
    expect(describeSlot(sp("21:30"), next)).toBe("amanhã às 8h");
  });
});

describe("política de compensação", () => {
  const ok: Verification = { payment: "confirmed", machine_log: "confirmed", camera: "confirmed" };
  const base = {
    kind: "reliberacao" as const,
    amountCents: 1500,
    verification: ok,
    requiredChecks: PROBLEMS.liberacao_demorada.checks,
    customerTodayCents: 0,
    storeTodayCents: 0,
    phoneVerified: true,
  };

  it("fase 1: mesmo confirmado, vai para o lojista", () => {
    expect(evaluateCompensation(base).outcome).toBe("needs_owner");
  });
  it("fase 2: confirmado e dentro do limite é automático", () => {
    expect(evaluateCompensation(base, { ...DEFAULT_POLICY, pilotPhase: 2 }).outcome).toBe("auto_approve");
  });
  it("nega quando uma conferência contradiz a falha", () => {
    const d = evaluateCompensation({ ...base, verification: { ...ok, camera: "not_confirmed" } });
    expect(d.outcome).toBe("deny");
  });
  it("estorno sempre exige o lojista", () => {
    const d = evaluateCompensation({ ...base, kind: "estorno" }, { ...DEFAULT_POLICY, pilotPhase: 2 });
    expect(d.outcome).toBe("needs_owner");
  });
  it("limite diário do cliente", () => {
    const d = evaluateCompensation({ ...base, customerTodayCents: 1500 }, { ...DEFAULT_POLICY, pilotPhase: 2 });
    expect(d.outcome).toBe("needs_owner");
  });
});

describe("catálogo de problemas", () => {
  it("tem os 10 problemas do lojista + outro", () => {
    expect(PROBLEM_LIST).toHaveLength(11);
    expect(isProblemType("sem_internet")).toBe(true);
    expect(isProblemType("xyz")).toBe(false);
  });
  it("queda de internet é crítica", () => {
    expect(PROBLEMS.sem_internet.priority).toBe("critical");
  });
});
