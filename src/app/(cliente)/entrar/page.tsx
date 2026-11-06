import { Suspense } from "react";
import { Gift, History, LayoutGrid } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar" };

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sua conta EasyWash</h1>
        <p className="text-sm text-muted-foreground">Opcional. O atendimento funciona sem conta.</p>
      </div>
      <ul className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { icon: Gift, label: "50 pontos de boas-vindas" },
          { icon: LayoutGrid, label: "Máquinas livres" },
          { icon: History, label: "Histórico e avisos" },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="glass-subtle flex flex-col items-center gap-1.5 rounded-2xl p-3">
            <Icon className="size-5 text-primary" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
      <GlassCard tone="strong" padding="lg">
        <Suspense fallback={<LoginForm />}>
          <LoginWithNext searchParams={searchParams} />
        </Suspense>
      </GlassCard>
    </div>
  );
}

async function LoginWithNext({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/conta";
  return (
    <>
      {sp.erro ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          O link expirou ou é inválido. Peça um novo.
        </p>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}
