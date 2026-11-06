import { Suspense } from "react";
import { FlaskConical } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/painel/ui";
import { SimulatorPanel } from "@/components/painel/simulator-panel";
import { requireOwner } from "@/server/auth";
import { getStoreById } from "@/server/store";
import { getMachineOptions } from "@/server/machines-public";
import { SCENARIOS, type ScenarioId } from "@/server/simulator";

export const metadata = { title: "Simulador" };

export default function SimuladorPage() {
  return (
    <div className="space-y-5">
      <PageTitle
        title="Simulador da demonstração"
        description="Gera os sinais que viriam do Cicclo, da Stone e das câmeras, para testar o atendente de ponta a ponta."
      />
      <GlassCard padding="md" className="flex items-start gap-3 text-sm">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>
          Roteiro sugerido: escolha a máquina, rode <strong>Pagou e não liberou</strong>, abra o atendimento como cliente
          (outra aba ou celular) e diga que pagou e a máquina não liberou. O atendente confere os fatos e manda a
          compensação para você aprovar em <strong>Casos</strong>.
        </p>
      </GlassCard>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireOwner();
  const store = await getStoreById(user.profile.store_id!);
  const machines = await getMachineOptions(store.id);
  const scenarios = (Object.keys(SCENARIOS) as ScenarioId[]).map((id) => ({ id, ...SCENARIOS[id] }));
  return <SimulatorPanel storeSlug={store.slug} scenarios={scenarios} machines={machines} />;
}
