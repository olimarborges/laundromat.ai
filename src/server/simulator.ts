import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextNotificationAt } from "@/domain/notifications";
import type { MachineRow, StoreRow } from "@/server/types";

/**
 * Simulador da demonstração: produz os mesmos sinais que viriam do Cicclo (registro),
 * da Stone (pagamentos) e das câmeras (fotos analisadas), para o atendente conferir.
 */

export const SCENARIOS = {
  liberacao_demorada: {
    title: "Pagou e não liberou",
    description: "Pagamento aprovado, máquina sem liberar há 3 min, painel apagado na câmera.",
    needsMachine: true,
  },
  erro_porta: {
    title: "Erro na trava da porta",
    description: "Pagou, liberou e a máquina acusou erro de porta com a porta fechada.",
    needsMachine: true,
  },
  nao_iniciou: {
    title: "Esqueceu de apertar INICIAR",
    description: "Pagou e liberou, mas o ciclo não começou (erro de uso).",
    needsMachine: true,
  },
  servico_errado: {
    title: "Pagou o serviço errado",
    description: "Pagamento na máquina errada, liberada e sem uso.",
    needsMachine: true,
  },
  roupa_esquecida: {
    title: "Roupa esquecida",
    description: "Ciclo terminou há 25 min e a câmera vê roupas no tambor.",
    needsMachine: true,
  },
  pelos_animais: {
    title: "Pelos de animal no tambor",
    description: "Câmera aponta sujeira/pelos no tambor.",
    needsMachine: true,
  },
  ciclo_curto: {
    title: "Ciclo terminando (1 min)",
    description: "Inicia um ciclo que termina em 1 minuto, para ver o aviso de fim de ciclo.",
    needsMachine: true,
  },
  maquininha_travada: {
    title: "Maquininha travou",
    description: "Terminal Stone congelado (precisa reiniciar).",
    needsMachine: false,
  },
  sem_internet: {
    title: "Queda de internet",
    description: "Internet da loja cai: máquinas e maquininha offline. Gera caso urgente.",
    needsMachine: false,
  },
  reset: {
    title: "Normalizar tudo",
    description: "Máquinas livres, maquininha e internet funcionando.",
    needsMachine: false,
  },
} as const;

export type ScenarioId = keyof typeof SCENARIOS;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export async function runScenario(store: StoreRow, scenario: ScenarioId, machine: MachineRow | null) {
  const db = createAdminClient();
  const s = store.id;
  const event = (type: string, at: string, payload: Record<string, unknown> = {}) =>
    db.from("machine_events").insert({ store_id: s, machine_id: machine!.id, type, payload: { ...payload, simulated: true }, created_at: at });
  const pay = (at: string) =>
    db.from("payments").insert({
      store_id: s,
      machine_id: machine!.id,
      amount_cents: machine!.price_cents,
      method: "credito",
      status: "approved",
      card_last4: String(1000 + Math.floor(Math.random() * 8999)),
      created_at: at,
    });
  const snap = (observation: string, analysis: Record<string, boolean>) =>
    db.from("camera_snapshots").insert({
      store_id: s,
      machine_id: machine!.id,
      observation,
      analysis: { ...analysis, faces_blurred: true },
    });
  const setMachine = (patch: Partial<MachineRow>) => db.from("machines").update(patch).eq("id", machine!.id);

  switch (scenario) {
    case "liberacao_demorada": {
      const at = minutesAgo(3);
      await pay(at);
      await event("payment_confirmed", at);
      await event("release_delayed", minutesAgo(1));
      await snap("painel da máquina apagado, porta fechada, tambor com roupas", { panel_lit: false, door_closed: true, drum_has_clothes: true });
      await setMachine({ status: "free", last_error: "Liberação pendente após pagamento" });
      break;
    }
    case "erro_porta": {
      await pay(minutesAgo(4));
      await event("payment_confirmed", minutesAgo(4));
      await event("released", minutesAgo(3));
      await event("door_error", minutesAgo(1), { code: "dL" });
      await snap("porta fechada, painel aceso piscando erro", { door_closed: true, panel_lit: true, drum_has_clothes: true });
      await setMachine({ status: "error", last_error: "Erro de trava da porta (dL)" });
      break;
    }
    case "nao_iniciou": {
      await pay(minutesAgo(4));
      await event("payment_confirmed", minutesAgo(4));
      await event("released", minutesAgo(3));
      await snap("painel aceso aguardando seleção, porta fechada", { door_closed: true, panel_lit: true, drum_has_clothes: true });
      await setMachine({ status: "released", released_at: minutesAgo(3), last_error: null });
      break;
    }
    case "servico_errado": {
      await pay(minutesAgo(2));
      await event("payment_confirmed", minutesAgo(2));
      await event("released", minutesAgo(1));
      await snap("painel aceso aguardando seleção, tambor vazio", { door_closed: true, panel_lit: true, drum_has_clothes: false });
      await setMachine({ status: "released", released_at: minutesAgo(1), last_error: null });
      break;
    }
    case "roupa_esquecida": {
      await event("started", minutesAgo(65));
      await event("finished", minutesAgo(25));
      await snap("tambor com roupas, porta fechada, painel indicando fim", { drum_has_clothes: true, door_closed: true, panel_lit: true });
      await setMachine({ status: "finished", cycle_started_at: minutesAgo(65), cycle_ends_at: minutesAgo(25), last_error: null });
      break;
    }
    case "pelos_animais": {
      await snap("pelos visíveis na borracha e no tambor", { drum_dirty: true, door_closed: false });
      await db.from("incidents").insert({ store_id: s, kind: "hygiene", machine_id: machine!.id, notes: "Simulado" });
      break;
    }
    case "ciclo_curto": {
      const now = Date.now();
      await event("started", new Date(now).toISOString());
      await setMachine({
        status: "running",
        cycle_started_at: new Date(now - (machine!.cycle_minutes - 1) * 60_000).toISOString(),
        cycle_ends_at: new Date(now + 60_000).toISOString(),
        last_error: null,
      });
      break;
    }
    case "maquininha_travada": {
      await db.from("payment_terminals").update({ status: "frozen", updated_at: new Date().toISOString() }).eq("store_id", s);
      await db.from("incidents").insert({ store_id: s, kind: "terminal_frozen", notes: "Simulado" });
      break;
    }
    case "sem_internet": {
      const now = new Date().toISOString();
      await db.from("stores").update({ internet_status: "offline", internet_changed_at: now }).eq("id", s);
      await db.from("payment_terminals").update({ status: "offline", updated_at: now }).eq("store_id", s);
      await db.from("machines").update({ status: "offline" }).eq("store_id", s);
      await db.from("incidents").insert({ store_id: s, kind: "internet_down", notes: "Simulado" });
      const { data: kase } = await db
        .from("cases")
        .insert({
          store_id: s,
          problem_type: "sem_internet",
          priority: "critical",
          status: "waiting_owner",
          title: "Queda de internet na loja",
          summary: "Monitoramento: internet da loja fora do ar. Máquinas e maquininha sem conexão; clientes não conseguem pagar nem liberar ciclos.",
          evidence: { machine_log: { status: "confirmed", detail: "Controladoras Cicclo sem resposta" }, payment: { status: "confirmed", detail: "Maquininha offline" } },
          actions_taken: ["Detectado pelo monitoramento", "Clientes orientados a não pagar até normalizar"],
          needs_physical: true,
          notify_at: nextNotificationAt(new Date(), "critical").toISOString(),
        })
        .select("id")
        .single();
      await db.from("owner_notifications").insert({
        store_id: s,
        case_id: kase?.id,
        priority: "critical",
        title: "Urgente: internet da loja caiu",
        body: "Máquinas e maquininha offline. Considere ir à loja ou ativar a conexão de contingência.",
      });
      break;
    }
    case "reset": {
      const now = new Date().toISOString();
      await db.from("stores").update({ internet_status: "online", internet_changed_at: now }).eq("id", s);
      await db.from("payment_terminals").update({ status: "ok", updated_at: now }).eq("store_id", s);
      await db
        .from("machines")
        .update({ status: "free", released_at: null, cycle_started_at: null, cycle_ends_at: null, last_error: null })
        .eq("store_id", s);
      await db.from("incidents").update({ ended_at: now }).eq("store_id", s).is("ended_at", null);
      break;
    }
  }
}
