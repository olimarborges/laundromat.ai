import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { SettingsForm } from "@/components/painel/settings-form";
import { requireOwner } from "@/server/auth";
import { getStore } from "@/server/store";

export const metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageTitle title="Configurações" description="Horários, avisos e regras de compensação do piloto." />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requireOwner();
  const store = await getStore();
  return <SettingsForm store={store} />;
}
