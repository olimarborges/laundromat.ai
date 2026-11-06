import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { GlassCard } from "@/components/glass/glass-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar no painel" };

export default function PanelLoginPage({ searchParams }: PageProps<"/painel/entrar">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <Brand href="/" subtitle="Painel do lojista" />
      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Entrar no painel</h1>
          <p className="text-sm text-muted-foreground">Casos, compensações, máquinas e relatórios da loja.</p>
        </div>
        <Suspense>
          <ErrorNotice searchParams={searchParams} />
        </Suspense>
        <LoginForm next="/painel" allowPassword />
      </GlassCard>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        O acesso de dono é dado ao e-mail cadastrado em stores.owner_email (veja o README).
      </p>
    </main>
  );
}

async function ErrorNotice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (sp.erro !== "sem-permissao") return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
      Esta conta não é de dono da loja. Entre com o e-mail do lojista.
    </p>
  );
}
