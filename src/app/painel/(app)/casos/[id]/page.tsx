import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, CreditCard, ListChecks, MinusCircle, ScrollText, User, XCircle } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge, StatusBadge } from "@/components/painel/ui";
import { CaseToolbar, CompensationDecision } from "@/components/painel/case-actions";
import { requireOwner } from "@/server/auth";
import { getCaseDetail } from "@/server/panel";
import { formatBRL, labelKind } from "@/domain/compensation";
import type { Evidence } from "@/server/types";

export const metadata = { title: "Caso" };

export default function CasePage({ params }: PageProps<"/painel/casos/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/painel/casos" className="inline-flex items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Casos
      </Link>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-3xl" />}>
        <CaseDetail params={params} />
      </Suspense>
    </div>
  );
}

const EVIDENCE_META = {
  payment: { label: "Pagamento (Stone)", icon: CreditCard },
  machine_log: { label: "Registro da máquina (Cicclo)", icon: ScrollText },
  camera: { label: "Câmera (rostos borrados)", icon: Camera },
} as const;

async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireOwner()]);
  const detail = await getCaseDetail(user.profile.store_id!, id);
  if (!detail) notFound();
  const { kase, compensations, conversation, messages } = detail;
  const pendingComp = compensations.find((c) => c.status === "pending");
  const evidence = kase.evidence as Evidence;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <div className="space-y-4">
        <GlassCard tone="strong" padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={kase.priority} />
            <StatusBadge status={kase.status} />
            {kase.needs_physical ? (
              <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[0.7rem] font-semibold text-destructive">
                Precisa ir à loja
              </span>
            ) : null}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{kase.title}</h1>
            <p className="mt-1 text-sm leading-relaxed">{kase.summary}</p>
          </div>
          {conversation ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4" aria-hidden />
              {conversation.visitor_name ?? "Cliente"}
              {conversation.visitor_phone ? ` · (${conversation.visitor_phone.slice(0, 2)}) ${conversation.visitor_phone.slice(2)}` : ""}
              {conversation.phone_verified ? " · celular confirmado" : ""}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(EVIDENCE_META) as (keyof typeof EVIDENCE_META)[]).map((k) => {
              const e = evidence[k];
              const Meta = EVIDENCE_META[k];
              return (
                <div key={k} className="rounded-2xl border bg-background/50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                    <Meta.icon className="size-3.5" aria-hidden /> {Meta.label}
                  </p>
                  {e ? (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      {e.status === "confirmed" ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Confirma a falha" />
                      ) : e.status === "not_confirmed" ? (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="Não confirma" />
                      ) : (
                        <MinusCircle className="mt-0.5 size-3.5 shrink-0" aria-label="Sem dados" />
                      )}
                      {e.detail}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Não se aplica.</p>
                  )}
                </div>
              );
            })}
          </div>

          {kase.actions_taken.length ? (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                <ListChecks className="size-3.5" aria-hidden /> O atendente já fez
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                {kase.actions_taken.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendingComp ? (
            <CompensationDecision
              id={pendingComp.id}
              kind={pendingComp.kind}
              amountCents={pendingComp.amount_cents}
              reasons={pendingComp.decision_reasons}
            />
          ) : compensations[0] ? (
            <p className="rounded-2xl bg-muted/60 p-3 text-sm">
              Compensação: {labelKind(compensations[0].kind)} · {formatBRL(compensations[0].amount_cents)} ·{" "}
              <StatusBadge status={compensations[0].status} />
            </p>
          ) : null}

          {kase.resolution ? (
            <p className="rounded-2xl bg-success/10 p-3 text-sm text-success">Resolução: {kase.resolution}</p>
          ) : null}

          <CaseToolbar
            caseId={kase.id}
            machineId={kase.machine_id}
            machineCode={kase.machines?.code ?? null}
            customerPhone={conversation?.visitor_phone ?? null}
            customerName={conversation?.visitor_name ?? null}
            summary={kase.summary}
            resolved={kase.status === "resolved"}
          />
        </GlassCard>
      </div>

      <GlassCard padding="none" className="flex max-h-[46rem] flex-col overflow-hidden">
        <p className="border-b border-border/60 p-4 text-sm font-semibold">Conversa com o atendente</p>
        <ol className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 ? <li className="text-sm text-muted-foreground">Sem conversa (detectado pelo monitoramento).</li> : null}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
            if (!text) return null;
            return (
              <li
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm whitespace-pre-line"
                }
              >
                {text.replace(/\*\*/g, "")}
              </li>
            );
          })}
        </ol>
      </GlassCard>
    </div>
  );
}
