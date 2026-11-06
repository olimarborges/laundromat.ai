"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedStores, requireOwner } from "@/server/auth";
import { PROBLEM_ICONS } from "@/domain/problems";

/** Problemas por lavanderia + troca de loja ativa. Tudo valida o vínculo do dono com as lojas. */

type Result = { ok: boolean; message: string };

async function ownerContext() {
  const user = await requireOwner();
  const stores = await getManagedStores(user.id, user.profile.role);
  // Admin mexe só na loja aberta no painel (evita alterar dezenas de lojas sem querer).
  const allowed = user.profile.role === "admin" ? stores.filter((s) => s.id === user.profile.store_id) : stores;
  return { user, stores: allowed, allowedIds: new Set(allowed.map((s) => s.id)) };
}

/** Problema que o dono pode ver: do catálogo público, dele, ou já usado numa loja dele. */
async function loadVisibleProblem(problemId: string, userId: string, allowedIds: Set<string>) {
  const db = createAdminClient();
  const { data: p } = await db.from("problems").select("*").eq("id", problemId).maybeSingle();
  if (!p) return null;
  if (p.visibility === "public" || p.owner_id === userId) return p;
  const { data: links } = await db.from("store_problems").select("store_id").eq("problem_id", problemId);
  return (links ?? []).some((l) => allowedIds.has(l.store_id as string)) ? p : null;
}

export async function setActiveStore(storeId: string) {
  const user = await requireOwner();
  const stores = await getManagedStores(user.id, user.profile.role);
  if (!stores.some((s) => s.id === storeId)) return;
  await createAdminClient().from("profiles").update({ store_id: storeId }).eq("id", user.id);
  revalidatePath("/painel", "layout");
  redirect("/painel");
}

/** Liga/desliga um problema em uma lavanderia. */
export async function toggleProblemStore(problemId: string, storeId: string, on: boolean): Promise<Result> {
  const { user, allowedIds } = await ownerContext();
  if (!allowedIds.has(storeId)) return { ok: false, message: "Lavanderia fora da sua conta." };
  const p = await loadVisibleProblem(problemId, user.id, allowedIds);
  if (!p) return { ok: false, message: "Problema não encontrado." };
  const db = createAdminClient();
  const { error } = on
    ? await db.from("store_problems").upsert({ store_id: storeId, problem_id: problemId }, { onConflict: "store_id,problem_id" })
    : await db.from("store_problems").delete().eq("store_id", storeId).eq("problem_id", problemId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: on ? "Problema ativado na lavanderia." : "Problema removido da lavanderia." };
}

/** Marca o problema em todas as lavanderias do dono de uma vez (ou em nenhuma). */
export async function setProblemAllStores(problemId: string, on: boolean): Promise<Result> {
  const { user, stores, allowedIds } = await ownerContext();
  const p = await loadVisibleProblem(problemId, user.id, allowedIds);
  if (!p) return { ok: false, message: "Problema não encontrado." };
  const db = createAdminClient();
  const ids = stores.map((s) => s.id);
  const { error } = on
    ? await db
        .from("store_problems")
        .upsert(ids.map((store_id) => ({ store_id, problem_id: problemId })), { onConflict: "store_id,problem_id", ignoreDuplicates: true })
    : await db.from("store_problems").delete().eq("problem_id", problemId).in("store_id", ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: on ? "Ativado em todas as suas lavanderias." : "Removido de todas as suas lavanderias." };
}

/** Solução diferente só para uma lavanderia (vazio = volta à solução padrão). */
export async function saveStoreSolution(problemId: string, storeId: string, text: string): Promise<Result> {
  const { allowedIds } = await ownerContext();
  if (!allowedIds.has(storeId)) return { ok: false, message: "Lavanderia fora da sua conta." };
  const value = text.trim().slice(0, 2000) || null;
  const { error } = await createAdminClient()
    .from("store_problems")
    .update({ custom_solution: value })
    .eq("store_id", storeId)
    .eq("problem_id", problemId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: value ? "Solução ajustada para esta lavanderia." : "Voltou a usar a solução padrão." };
}

const problemSchema = z.object({
  title: z.string().trim().min(4, "Dê um título ao problema.").max(80),
  chip: z.string().trim().min(4, "Escreva como o cliente diz o problema.").max(60),
  solution: z.string().trim().min(10, "Escreva a solução (um passo por linha).").max(2000),
  icon: z.enum(PROBLEM_ICONS).default("MessageCircleQuestion"),
  alwaysNotify: z.boolean().default(false),
  needsMachine: z.boolean().default(false),
  storeIds: z.array(z.string().uuid()).default([]),
  suggest: z.boolean().default(false),
});

export type ProblemInput = z.input<typeof problemSchema>;

export async function createProblem(input: ProblemInput): Promise<Result> {
  const { user, allowedIds } = await ownerContext();
  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const d = parsed.data;
  const storeIds = d.storeIds.filter((id) => allowedIds.has(id));
  const db = createAdminClient();
  const { data: p, error } = await db
    .from("problems")
    .insert({
      title: d.title,
      chip: d.chip,
      solution: d.solution,
      icon: d.icon,
      always_notify: d.alwaysNotify,
      needs_machine: d.needsMachine,
      escalate_when: d.alwaysNotify ? "Sempre avisar o lojista." : "Se a orientação não resolver.",
      builtin: false,
      visibility: d.suggest ? "pending" : "private",
      owner_id: user.id,
      origin_store_id: storeIds[0] ?? user.profile.store_id,
    })
    .select("id")
    .single();
  if (error || !p) return { ok: false, message: error?.message ?? "Erro ao criar." };
  if (storeIds.length) {
    await db.from("store_problems").insert(storeIds.map((store_id) => ({ store_id, problem_id: p.id })));
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: d.suggest
      ? "Problema criado e enviado para aprovação como sugestão para outras lavanderias."
      : "Problema criado.",
  };
}

export async function updateProblem(problemId: string, input: ProblemInput): Promise<Result> {
  const { user } = await ownerContext();
  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const d = parsed.data;
  const db = createAdminClient();
  const { data: p } = await db.from("problems").select("owner_id, visibility").eq("id", problemId).maybeSingle();
  if (!p || p.owner_id !== user.id) return { ok: false, message: "Só quem criou pode editar este problema." };
  if (p.visibility === "public") return { ok: false, message: "Problema já aprovado para todos: peça ao admin para editar." };
  const { error } = await db
    .from("problems")
    .update({
      title: d.title,
      chip: d.chip,
      solution: d.solution,
      icon: d.icon,
      always_notify: d.alwaysNotify,
      needs_machine: d.needsMachine,
      escalate_when: d.alwaysNotify ? "Sempre avisar o lojista." : "Se a orientação não resolver.",
      ...(d.suggest && p.visibility === "private" ? { visibility: "pending" } : {}),
    })
    .eq("id", problemId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Problema atualizado." };
}

export async function suggestProblem(problemId: string): Promise<Result> {
  const { user } = await ownerContext();
  const db = createAdminClient();
  const { data: p } = await db.from("problems").select("owner_id, visibility").eq("id", problemId).maybeSingle();
  if (!p || p.owner_id !== user.id) return { ok: false, message: "Só quem criou pode sugerir." };
  if (p.visibility !== "private") return { ok: false, message: "Este problema já foi sugerido." };
  await db.from("problems").update({ visibility: "pending" }).eq("id", problemId);
  revalidatePath("/painel/problemas");
  return { ok: true, message: "Enviado para aprovação. Se aprovado, aparece como sugestão para outras lavanderias." };
}

export async function deleteProblem(problemId: string): Promise<Result> {
  const { user } = await ownerContext();
  const db = createAdminClient();
  const { data: p } = await db.from("problems").select("owner_id, visibility").eq("id", problemId).maybeSingle();
  if (!p || p.owner_id !== user.id) return { ok: false, message: "Só quem criou pode excluir." };
  if (p.visibility === "public") return { ok: false, message: "Já aprovado para todos: não pode ser excluído por aqui." };
  await db.from("problems").delete().eq("id", problemId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Problema excluído." };
}
