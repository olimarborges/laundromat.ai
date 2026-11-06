import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerSupabase } from "@/lib/env";
import {
  CUSTOM_PREFIX,
  OTHER_PROBLEM,
  PROBLEM_LIST,
  fromDefinition,
  solutionToSteps,
  type Check,
  type StoreProblem,
} from "@/domain/problems";
import type { Priority } from "@/domain/notifications";

/** Linha do catálogo (tabela problems). */
export interface ProblemRow {
  id: string;
  slug: string | null;
  title: string;
  chip: string;
  icon: string;
  solution: string;
  escalate_when: string | null;
  priority: Priority;
  compensable: boolean;
  needs_machine: boolean;
  checks: string[];
  always_notify: boolean;
  builtin: boolean;
  visibility: "private" | "pending" | "public";
  owner_id: string | null;
  origin_store_id: string | null;
  sort: number;
  created_at: string;
  approved_at: string | null;
}

export function problemKey(row: Pick<ProblemRow, "id" | "slug" | "builtin">): string {
  return row.builtin && row.slug ? row.slug : `${CUSTOM_PREFIX}${row.id}`;
}

export function toStoreProblem(row: ProblemRow, customSolution?: string | null): StoreProblem {
  return {
    key: problemKey(row),
    id: row.id,
    builtin: row.builtin,
    chip: row.chip,
    title: row.title,
    icon: row.icon,
    needsMachine: row.needs_machine,
    checks: (row.checks ?? []) as Check[],
    compensable: row.compensable,
    priority: row.priority,
    steps: solutionToSteps(customSolution?.trim() ? customSolution : row.solution),
    escalateWhen: row.escalate_when ?? (row.always_notify ? "Sempre avisar o lojista." : "Se a orientação não resolver."),
    alwaysNotify: row.always_notify,
  };
}

/** Problemas ativos da loja (+ "Outro problema" no fim). */
export const getStoreProblems = cache(async (storeId: string): Promise<StoreProblem[]> => {
  if (!hasServerSupabase()) return [...PROBLEM_LIST.map(fromDefinition)];
  const { data } = await createAdminClient()
    .from("store_problems")
    .select("custom_solution, problems(*)")
    .eq("store_id", storeId);
  const list = (data ?? [])
    .map((r) => ({ row: r.problems as unknown as ProblemRow | null, custom: r.custom_solution as string | null }))
    .filter((x): x is { row: ProblemRow; custom: string | null } => Boolean(x.row))
    .sort((a, b) => a.row.sort - b.row.sort || a.row.title.localeCompare(b.row.title, "pt-BR"))
    .map(({ row, custom }) => toStoreProblem(row, custom));
  return [...list, OTHER_PROBLEM];
});

/** Problema da loja pela chave (slug ou custom:<uuid>). */
export async function findStoreProblem(storeId: string, key: string | null | undefined): Promise<StoreProblem | null> {
  if (!key) return null;
  const list = await getStoreProblems(storeId);
  return list.find((p) => p.key === key) ?? null;
}

/** Título legível de uma chave (para relatórios/listas), mesmo de problemas desmarcados. */
export async function problemTitles(keys: (string | null)[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const p of PROBLEM_LIST) out[p.id] = p.title;
  out.duvida = "Dúvida de uso";
  const customIds = [...new Set(keys.filter((k): k is string => Boolean(k?.startsWith(CUSTOM_PREFIX))))].map((k) =>
    k.slice(CUSTOM_PREFIX.length),
  );
  if (customIds.length && hasServerSupabase()) {
    const { data } = await createAdminClient().from("problems").select("id, title").in("id", customIds);
    for (const r of data ?? []) out[`${CUSTOM_PREFIX}${r.id}`] = r.title as string;
  }
  return out;
}
