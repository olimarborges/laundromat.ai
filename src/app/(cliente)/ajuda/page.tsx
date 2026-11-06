import { Suspense } from "react";
import { GlassCard } from "@/components/glass/glass-card";
import { FormSkeleton, StartFormLoader } from "@/components/cliente/start-form-loader";

export const metadata = { title: "Preciso de ajuda" };

export default function AjudaPage({ searchParams }: PageProps<"/ajuda">) {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Vamos resolver</h1>
        <p className="text-sm text-muted-foreground">Leva menos de um minuto. Depois é só conversar.</p>
      </div>
      <GlassCard tone="strong" padding="lg">
        <Suspense fallback={<FormSkeleton />}>
          <StartFormLoader searchParams={searchParams} />
        </Suspense>
      </GlassCard>
    </div>
  );
}
