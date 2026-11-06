import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadMessages } from "@/server/support";
import type {
  CaseRow,
  CompensationRow,
  ConversationRow,
  KbArticleRow,
  MachineRow,
  OwnerNotificationRow,
  TerminalRow,
} from "@/server/types";

/** Leituras do painel (sempre chamadas depois de requireOwner, filtrando pela loja do dono). */

const db = () => createAdminClient();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export async function getMachinesFull(storeId: string) {
  const [{ data: machines }, { data: terminal }] = await Promise.all([
    db().from("machines").select("*").eq("store_id", storeId).order("sort"),
    db().from("payment_terminals").select("*").eq("store_id", storeId).limit(1).maybeSingle(),
  ]);
  return { machines: (machines ?? []) as MachineRow[], terminal: terminal as TerminalRow | null };
}

export const getOverview = cache(async (storeId: string) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [cases, comps, today, month, notifications] = await Promise.all([
    db().from("cases").select("id, priority, status, notify_at").eq("store_id", storeId).in("status", ["open", "waiting_owner"]),
    db().from("compensations").select("id").eq("store_id", storeId).eq("status", "pending"),
    db().from("conversations").select("id, status, resolved_by").eq("store_id", storeId).gte("created_at", startOfDay.toISOString()),
    db()
      .from("conversations")
      .select("id, resolved_by, created_at, resolved_at")
      .eq("store_id", storeId)
      .eq("status", "resolved")
      .gte("created_at", daysAgo(30)),
    db()
      .from("owner_notifications")
      .select("*")
      .eq("store_id", storeId)
      .order("deliver_at", { ascending: false })
      .limit(30),
  ]);

  const resolved = month.data ?? [];
  const byAssistant = resolved.filter((c) => c.resolved_by === "assistant");
  const minutes = byAssistant
    .filter((c) => c.resolved_at)
    .map((c) => (Date.parse(c.resolved_at as string) - Date.parse(c.created_at)) / 60_000)
    .sort((a, b) => a - b);
  const median = minutes.length ? minutes[Math.floor(minutes.length / 2)] : null;
  const within5 = minutes.length ? minutes.filter((m) => m <= 5).length / minutes.length : null;

  return {
    openCases: (cases.data ?? []).length,
    criticalCases: (cases.data ?? []).filter((c) => c.priority === "critical").length,
    pendingCompensations: (comps.data ?? []).length,
    todayConversations: (today.data ?? []).length,
    resolvedWithoutOwnerRate: resolved.length ? byAssistant.length / resolved.length : null,
    medianMinutes: median,
    within5Rate: within5,
    notifications: (notifications.data ?? []) as OwnerNotificationRow[],
  };
});

export async function listCases(storeId: string) {
  const { data } = await db()
    .from("cases")
    .select("*, machines(code, label), compensations(id, status, kind, amount_cents)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(80);
  return (data ?? []) as (CaseRow & {
    machines: { code: string; label: string } | null;
    compensations: Pick<CompensationRow, "id" | "status" | "kind" | "amount_cents">[];
  })[];
}

export async function getCaseDetail(storeId: string, id: string) {
  const { data: kase } = await db()
    .from("cases")
    .select("*, machines(*)")
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();
  if (!kase) return null;
  const [{ data: comps }, { data: conv }] = await Promise.all([
    db().from("compensations").select("*").eq("case_id", id).order("created_at", { ascending: false }),
    kase.conversation_id
      ? db().from("conversations").select("*").eq("id", kase.conversation_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const messages = kase.conversation_id ? await loadMessages(kase.conversation_id) : [];
  return {
    kase: kase as CaseRow & { machines: MachineRow | null },
    compensations: (comps ?? []) as CompensationRow[],
    conversation: conv as ConversationRow | null,
    messages,
  };
}

export async function listCompensations(storeId: string) {
  const { data } = await db()
    .from("compensations")
    .select("*, cases(title, problem_type), conversations(visitor_name)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as (CompensationRow & {
    cases: { title: string; problem_type: string } | null;
    conversations: { visitor_name: string | null } | null;
  })[];
}

export async function listKbAll(storeId: string) {
  const { data } = await db().from("kb_articles").select("*").eq("store_id", storeId).order("sort");
  return (data ?? []) as KbArticleRow[];
}

export async function getReports(storeId: string, days = 30) {
  const since = daysAgo(days);
  const [{ data: convs }, { data: incidents }, { data: comps }, { data: machines }] = await Promise.all([
    db().from("conversations").select("problem_type, machine_id, resolved_by, status, created_at").eq("store_id", storeId).gte("created_at", since),
    db().from("incidents").select("kind, machine_id, started_at").eq("store_id", storeId).gte("started_at", since),
    db().from("compensations").select("amount_cents, status, created_at").eq("store_id", storeId).gte("created_at", since),
    db().from("machines").select("id, code").eq("store_id", storeId).order("sort"),
  ]);
  return {
    conversations: (convs ?? []) as Pick<ConversationRow, "problem_type" | "machine_id" | "resolved_by" | "status" | "created_at">[],
    incidents: (incidents ?? []) as { kind: string; machine_id: string | null; started_at: string }[],
    compensations: (comps ?? []) as { amount_cents: number; status: string; created_at: string }[],
    machines: (machines ?? []) as { id: string; code: string }[],
  };
}
