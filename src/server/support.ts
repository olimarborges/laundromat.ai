import "server-only";
import type { UIMessage } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrations } from "@/server/integrations";
import { getSessionUser } from "@/server/auth";
import { readVisitorToken } from "@/server/visitor";
import { evaluateCompensation, type CompensationKind, type Verification } from "@/domain/compensation";
import { nextNotificationAt, type Priority } from "@/domain/notifications";
import { PROBLEMS, isProblemType, type ProblemType } from "@/domain/problems";
import type {
  CaseRow,
  CompensationRow,
  ConversationRow,
  Evidence,
  KbArticleRow,
  MachineRow,
  StoreRow,
} from "@/server/types";

/** Serviços do atendimento: usados pela IA (tools), pelo modo roteiro e pelo painel. */

const db = () => createAdminClient();

// ───────────────────────────── Conversas ─────────────────────────────

export async function createConversation(input: {
  storeId: string;
  visitorToken: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  machineId: string | null;
  problemType: ProblemType | null;
  mode: "ai" | "script";
}): Promise<ConversationRow> {
  const { data, error } = await db()
    .from("conversations")
    .insert({
      store_id: input.storeId,
      visitor_token: input.visitorToken,
      customer_id: input.customerId,
      visitor_name: input.name,
      visitor_phone: input.phone,
      machine_id: input.machineId,
      problem_type: input.problemType,
      mode: input.mode,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

/** Conversa visível para quem está pedindo: visitante (cookie), cliente dono ou lojista. */
export async function getConversationForViewer(id: string): Promise<ConversationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("conversations").select("*").eq("id", id).maybeSingle();
  const conv = data as ConversationRow | null;
  if (!conv) return null;
  const visitor = await readVisitorToken();
  if (visitor && visitor === conv.visitor_token) return conv;
  const user = await getSessionUser();
  if (user && conv.customer_id === user.id) return conv;
  if (user?.profile?.role === "owner" && user.profile.store_id === conv.store_id) return conv;
  return null;
}

export async function updateConversation(id: string, patch: Partial<ConversationRow>) {
  const { error } = await db().from("conversations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function loadMessages(conversationId: string): Promise<UIMessage[]> {
  const { data } = await db()
    .from("messages")
    .select("id, role, parts")
    .eq("conversation_id", conversationId)
    .order("seq");
  return (data ?? []).map((m) => ({ id: m.id, role: m.role, parts: m.parts }) as UIMessage);
}

export async function saveMessages(conversationId: string, messages: UIMessage[]) {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    id: m.id,
    conversation_id: conversationId,
    role: m.role,
    parts: m.parts,
  }));
  const { error } = await db().from("messages").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  await updateConversation(conversationId, { updated_at: new Date().toISOString() } as Partial<ConversationRow>);
}

// ───────────────────────────── Máquinas e conferências ─────────────────────────────

export async function getMachineByCode(storeId: string, code: string): Promise<MachineRow | null> {
  return getIntegrations().cicclo.getMachine(storeId, code);
}

export async function getMachineById(id: string | null): Promise<MachineRow | null> {
  if (!id) return null;
  const { data } = await db().from("machines").select("*").eq("id", id).maybeSingle();
  return (data as MachineRow | null) ?? null;
}

/** Roda as conferências exigidas pelo problema e devolve as provas. */
export async function runChecks(
  storeId: string,
  machine: MachineRow | null,
  problem: ProblemType,
): Promise<{ evidence: Evidence; verification: Verification }> {
  const { cicclo, payments, camera } = getIntegrations();
  const def = PROBLEMS[problem];
  const evidence: Evidence = {};
  const verification: Verification = { payment: "unavailable", machine_log: "unavailable", camera: "unavailable" };

  await Promise.all(
    def.checks.map(async (check) => {
      if (check === "payment") {
        const r = await payments.checkPayment(storeId, machine?.id ?? null);
        evidence.payment = { status: r.status, detail: r.detail };
        verification.payment = r.status;
      } else if (check === "machine_log" && machine) {
        const r = await cicclo.checkMachineLog(storeId, machine.id);
        evidence.machine_log = { status: r.status, detail: r.detail };
        verification.machine_log = r.status;
      } else if (check === "camera" && machine) {
        const r = await camera.checkMachine(storeId, machine.id, problem);
        evidence.camera = { status: r.status, detail: r.detail };
        verification.camera = r.status;
      }
    }),
  );
  return { evidence, verification };
}

export async function listFreeMachines(storeId: string): Promise<MachineRow[]> {
  const machines = await getIntegrations().cicclo.listMachines(storeId);
  return machines.filter((m) => m.status === "free");
}

// ───────────────────────────── Casos e avisos ao lojista ─────────────────────────────

export async function openCase(input: {
  store: StoreRow;
  conversation: ConversationRow;
  machine: MachineRow | null;
  problemType: ProblemType;
  priority?: Priority;
  summary: string;
  evidence: Evidence;
  actionsTaken: string[];
  needsPhysical?: boolean;
}): Promise<CaseRow> {
  const def = PROBLEMS[input.problemType];
  const priority = input.priority ?? (input.needsPhysical ? "critical" : def.priority);
  const now = new Date();
  const notifyAt = nextNotificationAt(now, priority, input.store.notify_hours, input.store.timezone);
  const title = `${def.title}${input.machine ? ` · ${input.machine.label}` : ""}`;

  const { data, error } = await db()
    .from("cases")
    .insert({
      store_id: input.store.id,
      conversation_id: input.conversation.id,
      machine_id: input.machine?.id ?? null,
      problem_type: input.problemType,
      priority,
      status: "waiting_owner",
      title,
      summary: input.summary,
      evidence: input.evidence,
      actions_taken: input.actionsTaken,
      needs_physical: input.needsPhysical ?? false,
      notify_at: notifyAt.toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  const caseRow = data as CaseRow;

  await db().from("owner_notifications").insert({
    store_id: input.store.id,
    case_id: caseRow.id,
    priority,
    title: priority === "critical" ? `Urgente: ${title}` : title,
    body: input.summary,
    deliver_at: notifyAt.toISOString(),
  });
  await updateConversation(input.conversation.id, { status: "escalated", problem_type: input.problemType });
  return caseRow;
}

/** O atendente propõe; a política decide. Fase 1: sempre pendente para o lojista. */
export async function proposeCompensation(input: {
  store: StoreRow;
  conversation: ConversationRow;
  caseRow: CaseRow;
  machine: MachineRow | null;
  kind: CompensationKind;
  verification: Verification;
}): Promise<CompensationRow> {
  const def = PROBLEMS[(isProblemType(input.caseRow.problem_type) ? input.caseRow.problem_type : "outro") as ProblemType];
  const amount = input.machine?.price_cents ?? 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: today } = await db()
    .from("compensations")
    .select("amount_cents, conversation_id")
    .eq("store_id", input.store.id)
    .in("status", ["approved", "executed"])
    .gte("created_at", startOfDay.toISOString());
  const storeTodayCents = (today ?? []).reduce((s, r) => s + (r.amount_cents as number), 0);

  const decision = evaluateCompensation(
    {
      kind: input.kind,
      amountCents: amount,
      verification: input.verification,
      requiredChecks: def.checks,
      customerTodayCents: 0,
      storeTodayCents,
      phoneVerified: input.conversation.phone_verified,
    },
    { pilotPhase: input.store.pilot_phase, ...input.store.policy },
  );

  let status: CompensationRow["status"] =
    decision.outcome === "deny" ? "rejected" : decision.outcome === "auto_approve" ? "approved" : "pending";

  if (status === "approved" && input.kind === "reliberacao" && input.machine) {
    const r = await getIntegrations().cicclo.releaseMachine(input.store.id, input.machine.id, "Compensação automática");
    if (r.ok) status = "executed";
  }

  const { data, error } = await db()
    .from("compensations")
    .insert({
      store_id: input.store.id,
      case_id: input.caseRow.id,
      conversation_id: input.conversation.id,
      kind: input.kind,
      amount_cents: amount,
      status,
      decision: decision.outcome,
      decision_reasons: decision.reasons,
      verification: input.verification,
      decided_at: status === "pending" ? null : new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CompensationRow;
}

export async function resolveConversation(id: string, by: "assistant" | "owner", summary?: string) {
  await updateConversation(id, {
    status: "resolved",
    resolved_by: by,
    resolved_at: new Date().toISOString(),
    ...(summary ? { summary } : {}),
  });
}

export async function getConversationOutcome(conversationId: string) {
  const [{ data: cases }, { data: comps }] = await Promise.all([
    db().from("cases").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }),
    db().from("compensations").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }),
  ]);
  return { cases: (cases ?? []) as CaseRow[], compensations: (comps ?? []) as CompensationRow[] };
}

// ───────────────────────────── Base de conhecimento ─────────────────────────────

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ");

export async function listKb(storeId: string): Promise<KbArticleRow[]> {
  const { data } = await db()
    .from("kb_articles")
    .select("*")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("sort");
  return (data ?? []) as KbArticleRow[];
}

/** Busca simples por sobreposição de palavras (suficiente para ~dezenas de artigos). */
export async function searchKb(storeId: string, query: string, limit = 3): Promise<KbArticleRow[]> {
  const words = new Set(normalize(query).split(/\s+/).filter((w) => w.length > 2));
  const scored = (await listKb(storeId)).map((a) => {
    const hay = normalize(`${a.question} ${a.answer} ${a.tags.join(" ")}`);
    let score = 0;
    for (const w of words) if (hay.includes(w)) score += a.tags.some((t) => normalize(t).includes(w)) ? 3 : 1;
    return { a, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((s) => s.a);
}

// ───────────────────────────── Código no celular (simulado) ─────────────────────────────

export async function issueOtp(compensationId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db().from("compensations").update({ otp_code: code }).eq("id", compensationId);
  return code;
}
