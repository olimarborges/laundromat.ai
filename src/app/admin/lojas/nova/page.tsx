import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/painel/ui";
import { StoreForm } from "@/components/admin/store-form";

export const metadata = { title: "Nova lavanderia" };

export default function NewStorePage() {
  return (
    <div>
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Lavanderias
      </Link>
      <PageTitle title="Nova lavanderia" description="Ela aparece no mapa assim que for criada (se estiver com localização)." />
      <StoreForm />
    </div>
  );
}
