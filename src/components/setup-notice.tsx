import { Database } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";

/** Mostrado enquanto o .env.local não aponta para um projeto Supabase. */
export function SetupNotice() {
  return (
    <GlassCard tone="strong" padding="lg" className="mx-auto mt-10 max-w-md space-y-3 text-center">
      <Database className="mx-auto size-10 text-primary" aria-hidden />
      <h1 className="text-xl font-semibold">Falta conectar o Supabase</h1>
      <p className="text-sm text-muted-foreground">
        Preencha <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> e{" "}
        <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code>, aplique as
        migrations e reinicie o servidor. O passo a passo está no README.
      </p>
    </GlassCard>
  );
}
