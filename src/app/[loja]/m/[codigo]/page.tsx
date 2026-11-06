import { Suspense } from "react";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { FormSkeleton, StartFormLoader } from "@/components/cliente/start-form-loader";
import { requireStore } from "@/server/store";
import type { StoreRow } from "@/server/types";
import { getMachineOptions } from "@/server/machines-public";

/** Destino do QR Code colado em cada máquina (ex.: /m/L1). */
export default async function MachineQrPage({ params, searchParams }: PageProps<"/[loja]/m/[codigo]">) {
  const { loja, codigo } = await params;
  const store = await requireStore(loja);
  const machine = await resolve(store, codigo);
  return (
    <div className="space-y-4">
      <MachineHeader machine={machine} />
      <GlassCard tone="strong" padding="lg">
        <Suspense fallback={<FormSkeleton />}>
          <StartFormLoader store={store} searchParams={searchParams} machineCode={machine.code} />
        </Suspense>
      </GlassCard>
    </div>
  );
}

async function resolve(store: StoreRow, codigo: string) {
  const machines = await getMachineOptions(store.id);
  const m = machines.find((x) => x.code.toLowerCase() === decodeURIComponent(codigo).toLowerCase());
  if (!m) notFound();
  return m;
}

function MachineHeader({ machine: m }: { machine: { code: string; label: string } }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
        {m.code}
      </span>
      <div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <QrCode className="size-3.5" aria-hidden /> Você leu o QR Code da
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{m.label}</h1>
      </div>
    </div>
  );
}
