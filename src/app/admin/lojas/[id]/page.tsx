import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageTitle } from "@/components/painel/ui";
import { StoreForm } from "@/components/admin/store-form";
import { OpenPanelButton } from "@/components/admin/open-panel-button";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreRow } from "@/server/types";

export const metadata = { title: "Editar lavanderia" };

export default async function EditStorePage({ params }: PageProps<"/admin/lojas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await createAdminClient().from("stores").select("*").eq("id", id).maybeSingle();
  const store = data as StoreRow | null;
  if (!store) notFound();
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
      <StoreForm store={store} />
    </div>
  );
}
