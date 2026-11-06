import { Suspense } from "react";
import Link from "next/link";
import { Gift, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageTitle, StatusBadge } from "@/components/painel/ui";
import { CompensationDecision } from "@/components/painel/case-actions";
import { requireOwner } from "@/server/auth";
import { getStoreById } from "@/server/store";
import { listCompensations } from "@/server/panel";
import { requestNow } from "@/server/clock";
import { connection } from "next/server";
import { formatBRL, labelKind } from "@/domain/compensation";

export const metadata = { title: "Compensações" };

export default function CompensacoesPage() {
  return (
    <div className="space-y-5">
      <PageTitle title="Compensações" description="Só acontecem quando pagamento, registro e câmera confirmam a falha." />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await connection();
  const user = await requireOwner();
  const now = requestNow();
  const [list, store] = await Promise.all([listCompensations(user.profile.store_id!), getStoreById(user.profile.store_id!)]);
  const pending = list.filter((c) => c.status === "pending");
  const history = list.filter((c) => c.status !== "pending");
  const monthTotal = history
    .filter((c) => (c.status === "executed" || c.status === "approved") && Date.parse(c.created_at) > now - 30 * 86_400_000)
    .reduce((s, c) => s + c.amount_cents, 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">Aguardando você ({pending.length})</h2>
          {pending.length === 0 ? (
            <EmptyState icon={<Gift className="size-8" />} title="Nada pendente">
              Quando o atendente confirmar uma falha, a proposta aparece aqui.
            </EmptyState>
          ) : (
            pending.map((c) => (
              <GlassCard key={c.id} tone="strong" padding="md" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={c.case_id ? `/painel/casos/${c.case_id}` : "#"} className="font-semibold hover:underline">
                    {c.cases?.title ?? "Caso"}
                  </Link>
                  <span className="text-xs text-muted-foreground">{c.conversations?.visitor_name}</span>
                </div>
                <CompensationDecision id={c.id} kind={c.kind} amountCents={c.amount_cents} reasons={c.decision_reasons} />
              </GlassCard>
            ))
          )}
        </section>
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">Histórico</h2>
          <GlassCard padding="none" className="divide-y divide-border/60 overflow-hidden">
            {history.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1">
                  {labelKind(c.kind)}
                  <span className="block text-xs text-muted-foreground">
                    {c.cases?.title ?? "(demo) histórico"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <span className="tabular-nums">{formatBRL(c.amount_cents)}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </GlassCard>
        </section>
      </div>
      <GlassCard tone="strong" padding="lg" className="h-fit space-y-3">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" aria-hidden /> Regras em vigor
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Fase {store.pilot_phase} do piloto:</span>{" "}
            {store.pilot_phase === 1 ? "toda compensação passa pela sua aprovação." : "automática dentro dos limites abaixo."}
          </li>
          <li>Limite por caso: {formatBRL(store.policy.maxPerCaseCents)}</li>
          <li>Limite por cliente/dia: {formatBRL(store.policy.maxPerCustomerPerDayCents)}</li>
          <li>Limite da loja/dia: {formatBRL(store.policy.maxPerStorePerDayCents)}</li>
          <li>Estorno no cartão ou Pix: sempre com você.</li>
          <li>Celular do cliente confirmado por código antes de compensar.</li>
        </ul>
        <p className="rounded-2xl bg-primary/6 p-3 text-sm">
          Compensado nos últimos 30 dias: <span className="font-semibold tabular-nums">{formatBRL(monthTotal)}</span>
        </p>
        <Link href="/painel/configuracoes" className="text-sm font-medium text-primary hover:underline">
          Ajustar fase e limites →
        </Link>
      </GlassCard>
    </div>
  );
}
