import { Suspense } from "react";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { FormSkeleton, StartFormLoader } from "@/components/cliente/start-form-loader";
import { getStore } from "@/server/store";
import { getMachineOptions } from "@/server/machines-public";

/** Destino do QR Code colado em cada máquina (ex.: /m/L1). */
export default function MachineQrPage({ params, searchParams }: PageProps<"/m/[codigo]">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-14" />}>
        <MachineHeader params={params} />
      </Suspense>
      <GlassCard tone="strong" padding="lg">
        <Suspense fallback={<FormSkeleton />}>
          <MachineForm params={params} searchParams={searchParams} />
        </Suspense>
      </GlassCard>
    </div>
  );
}

async function resolve(params: Promise<{ codigo: string }>) {
  const { codigo } = await params;
  const store = await getStore();
  const machines = await getMachineOptions(store.id);
  const m = machines.find((x) => x.code.toLowerCase() === codigo.toLowerCase());
  if (!m) notFound();
  return m;
}

async function MachineHeader({ params }: { params: Promise<{ codigo: string }> }) {
  const m = await resolve(params);
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

async function MachineForm({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const m = await resolve(params);
  return <StartFormLoader searchParams={searchParams} machineCode={m.code} />;
}
