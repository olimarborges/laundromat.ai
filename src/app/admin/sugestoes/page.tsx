import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/painel/ui";
import { SuggestionsReview, type Suggestion } from "@/components/admin/suggestions-review";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Sugestões de problemas" };

export default async function SuggestionsPage() {
  const { data } = await createAdminClient()
    .from("problems")
    .select("id, title, chip, solution, created_at, stores:origin_store_id(name), profiles:owner_id(full_name)")
    .eq("visibility", "pending")
    .order("created_at");
  const items: Suggestion[] = (data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    chip: p.chip as string,
    solution: p.solution as string,
    createdAt: p.created_at as string,
    storeName: (p.stores as unknown as { name: string } | null)?.name ?? null,
    ownerName: (p.profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
  }));
  return (
    <div>
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Lavanderias
      </Link>
      <PageTitle
        title="Sugestões de problemas"
        description="Problemas que os donos criaram e sugeriram para outras lavanderias. Revise o texto antes de aprovar."
      />
      <SuggestionsReview items={items} />
    </div>
  );
}
