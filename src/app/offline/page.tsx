import { WifiOff } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <GlassCard tone="strong" padding="lg" className="w-full space-y-3 text-center">
        <WifiOff className="mx-auto size-10 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Seu celular está sem internet</h1>
        <p className="text-sm text-muted-foreground">
          O atendimento usa a internet do seu celular (não a da loja). Ative os dados móveis ou o Wi-Fi e tente de novo.
        </p>
      </GlassCard>
    </main>
  );
}
