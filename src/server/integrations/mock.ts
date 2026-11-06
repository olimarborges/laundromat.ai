import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/domain/compensation";
import type {
  CameraSnapshotRow,
  MachineEventRow,
  MachineRow,
  PaymentRow,
  TerminalRow,
} from "@/server/types";
import type { CameraGateway, CiccloGateway, Integrations, PaymentGateway } from "./types";

/**
 * Integrações simuladas: leem as tabelas que o Simulador do painel alimenta.
 * Mesmo contrato que as integrações reais vão cumprir.
 */

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const since = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const METHOD: Record<PaymentRow["method"], string> = { credito: "crédito", debito: "débito", pix: "Pix" };

const cicclo: CiccloGateway = {
  async listMachines(storeId) {
    const { data, error } = await createAdminClient()
      .from("machines")
      .select("*")
      .eq("store_id", storeId)
      .order("sort");
    if (error) throw error;
    return (data ?? []) as MachineRow[];
  },

  async getMachine(storeId, code) {
    const { data } = await createAdminClient()
      .from("machines")
      .select("*")
      .eq("store_id", storeId)
      .ilike("code", code)
      .maybeSingle();
    return (data as MachineRow | null) ?? null;
  },

  async recentEvents(storeId, machineId, minutes) {
    const { data } = await createAdminClient()
      .from("machine_events")
      .select("*")
      .eq("store_id", storeId)
      .eq("machine_id", machineId)
      .gte("created_at", since(minutes))
      .order("created_at", { ascending: true });
    return (data ?? []) as MachineEventRow[];
  },

  async checkMachineLog(storeId, machineId) {
    const events = await this.recentEvents(storeId, machineId, 45);
    if (events.length === 0) {
      return { status: "unavailable", detail: "Sem registros da máquina nos últimos 45 minutos.", data: events };
    }
    const find = (t: string) => events.findLast((e) => e.type === t);
    const err = find("door_error") ?? find("error");
    const paid = find("payment_confirmed");
    const released = find("released") ?? find("manual_release");
    const started = find("started");

    if (err) {
      return {
        status: "confirmed",
        detail: `Registro do Cicclo: ${err.type === "door_error" ? "erro de trava da porta" : "erro na máquina"} às ${hhmm(err.created_at)}.`,
        data: events,
      };
    }
    if (paid && !released) {
      const waited = Math.round((Date.now() - new Date(paid.created_at).getTime()) / 60_000);
      if (waited >= 2 || find("release_delayed")) {
        return {
          status: "confirmed",
          detail: `Pagamento confirmado às ${hhmm(paid.created_at)}, mas a máquina não foi liberada (${waited} min).`,
          data: events,
        };
      }
      return { status: "not_confirmed", detail: "Pagamento recente: a liberação ainda está dentro do prazo normal (até 2 min).", data: events };
    }
    if (released && !started) {
      return {
        status: "not_confirmed",
        detail: `Máquina liberada às ${hhmm(released.created_at)} e aguardando o botão INICIAR.`,
        data: events,
      };
    }
    if (started) {
      return { status: "not_confirmed", detail: `Ciclo iniciou normalmente às ${hhmm(started.created_at)}.`, data: events };
    }
    return { status: "unavailable", detail: "Registro sem eventos conclusivos.", data: events };
  },

  async releaseMachine(storeId, machineId, reason) {
    const db = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await db
      .from("machines")
      .update({ status: "released", released_at: now, last_error: null })
      .eq("id", machineId)
      .eq("store_id", storeId);
    if (error) return { ok: false, detail: error.message };
    await db.from("machine_events").insert({
      store_id: storeId,
      machine_id: machineId,
      type: "manual_release",
      payload: { reason, simulated: true },
    });
    return { ok: true, detail: "Máquina liberada sem cobrança (simulação do Cicclo)." };
  },
};

const payments: PaymentGateway = {
  async recentPayments(storeId, { machineId, minutes }) {
    let q = createAdminClient()
      .from("payments")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", since(minutes))
      .order("created_at", { ascending: false });
    if (machineId) q = q.eq("machine_id", machineId);
    const { data } = await q;
    return (data ?? []) as PaymentRow[];
  },

  async checkPayment(storeId, machineId) {
    const list = await this.recentPayments(storeId, { machineId: machineId ?? undefined, minutes: 45 });
    const approved = list.filter((p) => p.status === "approved");
    if (approved.length === 0) {
      const declined = list.find((p) => p.status === "declined");
      return {
        status: "not_confirmed",
        detail: declined
          ? `Última tentativa às ${hhmm(declined.created_at)} foi recusada pela Stone.`
          : "Nenhum pagamento aprovado nos últimos 45 minutos.",
        data: list,
      };
    }
    const p = approved[0];
    const dup = approved.length > 1 && Date.parse(approved[0].created_at) - Date.parse(approved[1].created_at) < 10 * 60_000;
    return {
      status: "confirmed",
      detail:
        `Pagamento de ${formatBRL(p.amount_cents)} aprovado às ${hhmm(p.created_at)} (${METHOD[p.method]}` +
        (p.card_last4 ? ` final ${p.card_last4})` : ")") +
        (dup ? ". Atenção: há duas cobranças em menos de 10 min." : "."),
      data: approved,
    };
  },

  async terminalStatus(storeId) {
    const { data } = await createAdminClient()
      .from("payment_terminals")
      .select("*")
      .eq("store_id", storeId)
      .limit(1)
      .maybeSingle();
    return (data as TerminalRow | null) ?? null;
  },
};

const camera: CameraGateway = {
  async latestSnapshot(storeId, machineId) {
    const { data } = await createAdminClient()
      .from("camera_snapshots")
      .select("*")
      .eq("store_id", storeId)
      .eq("machine_id", machineId)
      .gte("taken_at", since(10))
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as CameraSnapshotRow | null) ?? null;
  },

  async checkMachine(storeId, machineId, problem) {
    const snap = await this.latestSnapshot(storeId, machineId);
    if (!snap) return { status: "unavailable", detail: "Sem foto recente da câmera para esta máquina." };
    const a = snap.analysis;
    const when = `Foto das ${hhmm(snap.taken_at)}`;
    let status: "confirmed" | "not_confirmed" = "not_confirmed";
    switch (problem) {
      case "erro_porta":
        status = a.door_closed ? "confirmed" : "not_confirmed";
        break;
      case "liberacao_demorada":
      case "servico_errado":
        status = a.panel_lit === false ? "confirmed" : "not_confirmed";
        break;
      case "pelos_animais":
        status = a.drum_dirty ? "confirmed" : "not_confirmed";
        break;
      case "roupa_esquecida":
        status = a.drum_has_clothes ? "confirmed" : "not_confirmed";
        break;
      default:
        status = "confirmed";
    }
    return { status, detail: `${when}: ${snap.observation}`, data: snap };
  },
};

export const mockIntegrations: Integrations = { cicclo, payments, camera };
