import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { KbEditor } from "@/components/painel/kb-editor";
import { requireOwner } from "@/server/auth";
import { listKbAll } from "@/server/panel";

export const metadata = { title: "Respostas da loja" };

export default function KbPage() {
  return (
    <div>
      <PageTitle
        title="Respostas da loja"
        description="O atendente responde dúvidas com estes textos. Revise os marcados antes de abrir ao público."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireOwner();
  const articles = await listKbAll(user.profile.store_id!);
  return <KbEditor articles={articles} />;
}
