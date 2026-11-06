import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { ProblemsManager, type ManagerProblem } from "@/components/painel/problems-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedStores, requireOwner } from "@/server/auth";
import type { ProblemRow } from "@/server/problems";

export const metadata = { title: "Problemas e soluções" };

export default function ProblemasPage() {
  return (
    <div>
      <PageTitle
        title="Problemas e soluções"
        description="Escolha quais problemas acontecem em cada lavanderia. O assistente só trata os marcados."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireOwner();
  const all = await getManagedStores(user.id, user.profile.role);
  // Admin: só a loja aberta no painel; dono: todas as dele.
  const stores = user.profile.role === "admin" ? all.filter((s) => s.id === user.profile.store_id) : all;
  const storeIds = stores.map((s) => s.id);
  const db = createAdminClient();

  const [{ data: links }, { data: catalog }] = await Promise.all([
    db.from("store_problems").select("store_id, problem_id, custom_solution").in("store_id", storeIds),
    db.from("problems").select("*").or(`visibility.eq.public,owner_id.eq.${user.id}`),
  ]);
  const linked = links ?? [];
  // Problemas privados de outro dono já usados numa loja minha (ex.: casal que divide a loja).
  const missingIds = [...new Set(linked.map((l) => l.problem_id as string))].filter(
    (id) => !(catalog ?? []).some((p) => p.id === id),
  );
  const { data: extra } = missingIds.length
    ? await db.from("problems").select("*").in("id", missingIds)
    : { data: [] as ProblemRow[] };

  const problems: ManagerProblem[] = [...((catalog ?? []) as ProblemRow[]), ...((extra ?? []) as ProblemRow[])]
    .sort((a, b) => Number(b.builtin) - Number(a.builtin) || a.sort - b.sort || a.title.localeCompare(b.title, "pt-BR"))
    .map((p) => ({
      id: p.id,
      title: p.title,
      chip: p.chip,
      icon: p.icon,
      solution: p.solution,
      alwaysNotify: p.always_notify,
      needsMachine: p.needs_machine,
      builtin: p.builtin,
      visibility: p.visibility,
      mine: p.owner_id === user.id,
      community: !p.builtin && p.visibility === "public",
      stores: Object.fromEntries(
        linked.filter((l) => l.problem_id === p.id).map((l) => [l.store_id as string, (l.custom_solution as string | null) ?? null]),
      ),
    }));

  return <ProblemsManager stores={stores} problems={problems} activeStoreId={user.profile.store_id!} />;
}
