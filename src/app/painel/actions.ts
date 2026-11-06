"use server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/server/auth";
import { getStore } from "@/server/store";
import { getIntegrations } from "@/server/integrations";
import { getMachineByCode } from "@/server/support";
import { runScenario, SCENARIOS, type ScenarioId } from "@/server/simulator";

/** Ações do painel. Toda ação revalida a sessão do dono (o proxy é só otimista). */

async function ownerStore() {
  const user = await requireOwner();
  const store = await getStore();
  if (store.id !== user.profile.store_id) throw new Error("Sem permissão para esta loja.");
  return { user, store };
}

type Result = { ok: boolean; message: string };

// ───────────────────────────── Simulador ─────────────────────────────

export async function simulate(scenario: ScenarioId, machineCode?: string): Promise<Result> {
  const { store } = await ownerStore();
  if (!(scenario in SCENARIOS)) return { ok: false, message: "Cenário inválido." };
  const def = SCENARIOS[scenario];
  const machine = machineCode ? await getMachineByCode(store.id, machineCode) : null;
  if (def.needsMachine && !machine) return { ok: false, message: "Escolha uma máquina." };
  await runScenario(store, scenario, machine);
  updateTag("store");
  refresh();
  return { ok: true, message: `${def.title}${machine ? ` · ${machine.code}` : ""}: simulado.` };
}

// ───────────────────────────── Compensações e casos ─────────────────────────────

export async function decideCompensation(compensationId: string, approve: boolean, note?: string): Promise<Result> {
  const { user, store } = await ownerStore();
  const db = createAdminClient();
  const { data: comp } = await db
    .from("compensations")
    .select("*, cases(machine_id)")
    .eq("id", compensationId)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!comp) return { ok: false, message: "Compensação não encontrada." };
  if (comp.status !== "pending") return { ok: false, message: "Esta compensação já foi decidida." };

  let status = approve ? "approved" : "rejected";
  let message = approve ? "Compensação aprovada." : "Compensação recusada.";
  const machineId = (comp.cases as { machine_id: string | null } | null)?.machine_id;
  if (approve && comp.kind === "reliberacao" && machineId) {
    const r = await getIntegrations().cicclo.releaseMachine(store.id, machineId, "Aprovado pelo lojista");
    if (r.ok) {
      status = "executed";
      message = "Aprovada e máquina liberada sem custo.";
    }
  }
  await db
    .from("compensations")
    .update({ status, decided_by: user.id, decided_at: new Date().toISOString(), owner_note: note?.slice(0, 200) || null })
    .eq("id", compensationId);
  if (comp.case_id) {
    await db
      .from("cases")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution: message })
      .eq("id", comp.case_id);
  }
  if (comp.conversation_id) {
    await db
      .from("conversations")
      .update({ status: "resolved", resolved_by: "owner", resolved_at: new Date().toISOString() })
      .eq("id", comp.conversation_id);
  }
  refresh();
  return { ok: true, message };
}

export async function resolveCase(caseId: string, resolution: string): Promise<Result> {
  const { store } = await ownerStore();
  const db = createAdminClient();
  const { data: kase } = await db.from("cases").select("id, conversation_id").eq("id", caseId).eq("store_id", store.id).maybeSingle();
  if (!kase) return { ok: false, message: "Caso não encontrado." };
  await db
    .from("cases")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution: resolution.slice(0, 300) || "Resolvido pelo lojista" })
    .eq("id", caseId);
  if (kase.conversation_id) {
    await db
      .from("conversations")
      .update({ status: "resolved", resolved_by: "owner", resolved_at: new Date().toISOString() })
      .eq("id", kase.conversation_id);
  }
  refresh();
  return { ok: true, message: "Caso resolvido." };
}

export async function releaseMachineAction(machineId: string): Promise<Result> {
  const { store } = await ownerStore();
  const r = await getIntegrations().cicclo.releaseMachine(store.id, machineId, "Liberação manual pelo painel");
  refresh();
  return { ok: r.ok, message: r.detail };
}

export async function clearMachineError(machineId: string): Promise<Result> {
  const { store } = await ownerStore();
  await createAdminClient()
    .from("machines")
    .update({ status: "free", last_error: null, released_at: null })
    .eq("id", machineId)
    .eq("store_id", store.id);
  refresh();
  return { ok: true, message: "Máquina normalizada." };
}

export async function markNotificationsRead(): Promise<Result> {
  const { store } = await ownerStore();
  await createAdminClient()
    .from("owner_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("store_id", store.id)
    .is("read_at", null)
    .lte("deliver_at", new Date().toISOString());
  refresh();
  return { ok: true, message: "Avisos marcados como lidos." };
}

// ───────────────────────────── Base de conhecimento ─────────────────────────────

const kbSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(2).max(40),
  question: z.string().trim().min(5).max(160),
  answer: z.string().trim().min(10).max(1200),
  tags: z.string().optional(),
  active: z.boolean().default(true),
});

export async function saveKbArticle(input: z.input<typeof kbSchema>): Promise<Result> {
  const { store } = await ownerStore();
  const parsed = kbSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Preencha categoria, pergunta e resposta." };
  const { id, tags, ...rest } = parsed.data;
  const row = {
    ...rest,
    store_id: store.id,
    tags: (tags ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    needs_review: false,
  };
  const db = createAdminClient();
  const { error } = id
    ? await db.from("kb_articles").update(row).eq("id", id).eq("store_id", store.id)
    : await db.from("kb_articles").insert(row);
  if (error) return { ok: false, message: error.message };
  updateTag("kb");
  refresh();
  return { ok: true, message: "Resposta salva. O atendente já usa a nova versão." };
}

export async function toggleKbArticle(id: string, active: boolean): Promise<Result> {
  const { store } = await ownerStore();
  await createAdminClient().from("kb_articles").update({ active }).eq("id", id).eq("store_id", store.id);
  updateTag("kb");
  refresh();
  return { ok: true, message: active ? "Resposta ativada." : "Resposta desativada." };
}

// ───────────────────────────── Configurações ─────────────────────────────

const settingsSchema = z.object({
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
  owner_whatsapp: z.string().trim().max(20).optional(),
  pilot_phase: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
  notify_hours: z.array(z.coerce.number().int().min(0).max(23)).max(12),
  maxPerCaseCents: z.coerce.number().int().min(0).max(100_000),
  maxPerCustomerPerDayCents: z.coerce.number().int().min(0).max(100_000),
  maxPerStorePerDayCents: z.coerce.number().int().min(0).max(1_000_000),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<Result> {
  const { store } = await ownerStore();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos." };
  const d = parsed.data;
  const { error } = await createAdminClient()
    .from("stores")
    .update({
      open_time: d.open_time,
      close_time: d.close_time,
      owner_whatsapp: d.owner_whatsapp?.replace(/\D/g, "") || null,
      pilot_phase: d.pilot_phase,
      notify_hours: [...new Set(d.notify_hours)].sort((a, b) => a - b),
      policy: {
        maxPerCaseCents: d.maxPerCaseCents,
        maxPerCustomerPerDayCents: d.maxPerCustomerPerDayCents,
        maxPerStorePerDayCents: d.maxPerStorePerDayCents,
      },
    })
    .eq("id", store.id);
  if (error) return { ok: false, message: error.message };
  updateTag("store");
  refresh();
  return { ok: true, message: "Configurações salvas." };
}
