import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageTitle } from "@/components/painel/ui";
import { StoreForm } from "@/components/admin/store-form";
import { OpenPanelButton } from "@/components/admin/open-panel-button";
import { StoreOwners } from "@/components/admin/store-owners";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreRow } from "@/server/types";

export const metadata = { title: "Editar lavanderia" };

export default async function EditStorePage({ params }: PageProps<"/admin/lojas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data } = await db.from("stores").select("*").eq("id", id).maybeSingle();
  const store = data as StoreRow | null;
  if (!store) notFound();

  // Donos vinculados (+ e-mail do Auth e quantas outras lojas cada um tem).
  const { data: members } = await db.from("store_members").select("profile_id, profiles(full_name)").eq("store_id", id);
  const ids = (members ?? []).map((m) => m.profile_id as string);
  const [{ data: users }, { data: others }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    ids.length ? db.from("store_members").select("profile_id").in("profile_id", ids).neq("store_id", id) : Promise.resolve({ data: [] }),
  ]);
  const owners = ids.map((pid) => ({
    id: pid,
    email: users?.users.find((u) => u.id === pid)?.email ?? null,
    name: ((members ?? []).find((m) => m.profile_id === pid)?.profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
    otherStores: (others ?? []).filter((o) => o.profile_id === pid).length,
  }));
  return (
    <div>
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Lavanderias
      </Link>
      <PageTitle
        title={store.name}
        description={`/${store.slug}`}
        action={
          <div className="flex items-center gap-1.5">
            <Link href={`/${store.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm">
              Ver como cliente <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <OpenPanelButton storeId={store.id} />
          </div>
        }
      />
      <div className="space-y-4">
        <StoreForm store={store} />
        <StoreOwners storeId={store.id} owners={owners} />
      </div>
    </div>
  );
}
