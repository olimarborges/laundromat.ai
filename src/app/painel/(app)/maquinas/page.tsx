import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { MachinesAdmin } from "@/components/painel/machines-admin";
import { requireOwner } from "@/server/auth";
import { getMachinesFull } from "@/server/panel";
import { env } from "@/lib/env";

export const metadata = { title: "Máquinas" };

export default function MaquinasPainelPage() {
  return (
    <div>
      <PageTitle
        title="Máquinas"
        description="Estado ao vivo (simulado até a integração com o Cicclo). Modelos e preços a confirmar."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireOwner();
  const { machines } = await getMachinesFull(user.profile.store_id!);
  return <MachinesAdmin machines={machines} appUrl={env.appUrl} />;
}
