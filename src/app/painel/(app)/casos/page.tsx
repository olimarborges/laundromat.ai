import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Clock, Inbox } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageTitle, PriorityBadge, StatusBadge } from "@/components/painel/ui";
import { ProblemIcon } from "@/components/icon";
import { requireOwner } from "@/server/auth";
import { listCases } from "@/server/panel";
import { requestNow } from "@/server/clock";
import { PROBLEMS, isProblemType } from "@/domain/problems";

export const metadata = { title: "Casos" };

export default function CasosPage() {
  return (
    <div>
      <PageTitle title="Casos" description="Chegam prontos: resumo, provas e o que o atendente já fez." />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <CaseList />
      </Suspense>
    </div>
  );
}

async function CaseList() {
  await connection();
  const user = await requireOwner();
  const cases = await listCases(user.profile.store_id!);
  const now = requestNow();
  const open = cases.filter((c) => c.status === "open" || c.status === "waiting_owner");
  const urgent = open.filter((c) => c.priority === "critical");
  const delivered = open.filter((c) => c.priority !== "critical" && Date.parse(c.notify_at) <= now);
  const queued = open.filter((c) => c.priority !== "critical" && Date.parse(c.notify_at) > now);
  const done = cases.filter((c) => c.status === "resolved" || c.status === "dismissed").slice(0, 15);

  if (cases.length === 0) {
    return (
      <EmptyState icon={<Inbox className="size-8" />} title="Nenhum caso ainda">
        Use o Simulador e abra um atendimento pelo celular para ver um caso chegar aqui.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <Group title="Urgentes" items={urgent} empty="Nada urgente." />
      <Group title="Para você agora" items={delivered} empty="Nenhum caso entregue aguardando." />
      <Group
        title="No próximo lote"
        hint="Você recebe no próximo horário combinado. Pode adiantar se quiser."
        items={queued}
        empty="Fila vazia."
      />
      <Group title="Resolvidos recentemente" items={done} empty="—" />
    </div>
  );
}

function Group({
  title,
  hint,
  items,
  empty,
}: {
  title: string;
  hint?: string;
  items: Awaited<ReturnType<typeof listCases>>;
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {title} <span className="tabular-nums">({items.length})</span>
        </h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <GlassCard tone="strong" padding="none" className="divide-y divide-border/60 overflow-hidden">
          {items.map((c) => {
            const def = isProblemType(c.problem_type) ? PROBLEMS[c.problem_type] : null;
            const comp = c.compensations[0];
            return (
              <Link key={c.id} href={`/painel/casos/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ProblemIcon name={def?.icon ?? "MessageCircleQuestion"} className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                    {comp?.status === "pending" ? <StatusBadge status="pending" /> : null}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{c.summary}</p>
                  <p className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    {new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            );
          })}
        </GlassCard>
      )}
    </section>
  );
}
