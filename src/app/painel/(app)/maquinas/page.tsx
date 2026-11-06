import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { MachinesAdmin } from "@/components/painel/machines-admin";
import { requireOwner } from "@/server/auth";
import { getMachinesFull } from "@/server/panel";
import { getStoreById } from "@/server/store";
import { headers } from "next/headers";

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
  const [{ machines }, h, store] = await Promise.all([
    getMachinesFull(user.profile.store_id!),
    headers(),
    getStoreById(user.profile.store_id!),
  ]);
  // URL pública a partir da requisição (funciona em localhost, workers.dev ou domínio próprio).
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return <MachinesAdmin machines={machines} storeUrl={`${proto}://${host}/${store.slug}`} />;
}
