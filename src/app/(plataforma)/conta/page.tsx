import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleUserRound, Gift, LayoutDashboard, MessageSquare, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth";
import { PROBLEMS, isProblemType } from "@/domain/problems";

export const metadata = { title: "Minha conta" };

export default function ContaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <GlassCard tone="strong" padding="lg" className="space-y-3 text-center">
        <CircleUserRound className="mx-auto size-10 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Crie sua conta (opcional)</h1>
        <p className="text-sm text-muted-foreground">Junte pontos, veja seu histórico e as máquinas livres.</p>
        <Link
          href="/entrar"
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 font-semibold text-primary-foreground"
        >
          Entrar ou criar conta
        </Link>
      </GlassCard>
    );
  }

  const supabase = await createClient();
  const [{ data: ledger }, { data: convs }] = await Promise.all([
    supabase.from("loyalty_ledger").select("id, points, reason, created_at").order("created_at", { ascending: false }).limit(10),
    supabase
      .from("conversations")
      .select("id, problem_type, status, created_at, stores(name)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const points = user.profile?.points ?? 0;
  const role = user.profile?.role;

  return (
    <div className="space-y-4">
      {role === "admin" || role === "owner" ? (
        <section aria-label="Acessos de gestão" className="space-y-2">
          {role === "admin" ? (
            <Link href="/admin" className="block">
              <GlassCard tone="strong" interactive padding="md" className="flex items-center gap-3 ring-1 ring-primary/30">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Administração da plataforma</span>
                  <span className="block text-xs text-muted-foreground">Lavanderias, donos e acessos</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </GlassCard>
            </Link>
          ) : null}
          {role === "owner" || user.profile?.store_id ? (
            <Link href="/painel" className="block">
              <GlassCard tone="strong" interactive padding="md" className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <LayoutDashboard className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Painel do lojista</span>
                  <span className="block text-xs text-muted-foreground">Casos, compensações, máquinas e relatórios</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </GlassCard>
            </Link>
          ) : null}
        </section>
      ) : null}
      <GlassCard tone="strong" padding="lg" className="space-y-1">
        <p className="text-sm text-muted-foreground">Olá{user.profile?.full_name ? `, ${user.profile.full_name.split(" ")[0]}` : ""}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">{points}</p>
            <p className="text-sm text-muted-foreground">pontos para usar nas lavanderias parceiras</p>
          </div>
          <Gift className="size-10 text-aqua" aria-hidden />
        </div>
        <div className="pt-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-aqua to-primary" style={{ width: `${Math.min(100, (points / 200) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">200 pontos = 1 lavagem grátis (regra a definir com a loja)</p>
        </div>
      </GlassCard>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">Seus atendimentos</h2>
        <GlassCard padding="none" className="divide-y divide-border/70 overflow-hidden">
          {(convs ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum atendimento ainda.</p>
          ) : (
            (convs ?? []).map((c) => (
              <Link key={c.id} href={`/atendimento/${c.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                {c.status === "resolved" ? (
                  <CheckCircle2 className="size-5 text-success" aria-hidden />
                ) : (
                  <MessageSquare className="size-5 text-primary" aria-hidden />
                )}
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate">
                    {isProblemType(c.problem_type) ? PROBLEMS[c.problem_type].title : "Atendimento"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {(c.stores as unknown as { name: string } | null)?.name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
              </Link>
            ))
          )}
        </GlassCard>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">Extrato de pontos</h2>
        <GlassCard padding="none" className="divide-y divide-border/70 overflow-hidden">
          {(ledger ?? []).map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{l.reason}</span>
              <span className="font-semibold text-success tabular-nums">+{l.points}</span>
            </div>
          ))}
        </GlassCard>
      </section>

      <SignOutButton />
    </div>
  );
}
