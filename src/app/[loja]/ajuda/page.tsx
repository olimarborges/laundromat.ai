import { Suspense } from "react";
import { GlassCard } from "@/components/glass/glass-card";
import { FormSkeleton, StartFormLoader } from "@/components/cliente/start-form-loader";
import { requireStore } from "@/server/store";

export const metadata = { title: "Preciso de ajuda" };

export default async function AjudaPage({ params, searchParams }: PageProps<"/[loja]/ajuda">) {
  const store = await requireStore((await params).loja);
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Como podemos te ajudar?</h1>
        <p className="text-sm text-muted-foreground">Diga seu nome e, se quiser, o assunto. Depois é só conversar.</p>
      </div>
      <GlassCard tone="strong" padding="lg">
        <Suspense fallback={<FormSkeleton />}>
          <StartFormLoader store={store} searchParams={searchParams} />
        </Suspense>
      </GlassCard>
    </div>
  );
}
