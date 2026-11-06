import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, Bell, BellRing, Bot, Gift, Inbox, Timer } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton, PageTitle, StatCard } from "@/components/painel/ui";
import { LiveStoreStatus } from "@/components/painel/live-store-status";
import { MarkReadButton } from "@/components/painel/mark-read-button";
import { requireOwner } from "@/server/auth";
import { getStore } from "@/server/store";
import { getMachinesFull, getOverview } from "@/server/panel";
import { describeSlot, nextNotificationAt } from "@/domain/notifications";

export const metadata = { title: "Visão geral" };

export default function PanelHome() {
  return (
    <div className="space-y-6">
      <PageTitle title="Visão geral" description="O que precisa de você agora e como está a loja." />
      <Suspense fallback={<GridSkeleton />}>
        <Kpis />
      </Suspense>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="loja" className="space-y-3">
          <h2 id="loja" className="px-1 text-sm font-semibold text-muted-foreground">
            Loja agora
          </h2>
          <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
            <StoreNow />
          </Suspense>
        </section>
        <section aria-labelledby="avisos" className="space-y-3">
          <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
            <Notifications />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function Kpis() {
  const user = await requireOwner();
  const o = await getOverview(user.profile.store_id!);
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Link href="/painel/casos">
        <StatCard
          label="Casos aguardando"
          value={o.openCases}
          hint={o.criticalCases ? `${o.criticalCases} urgente(s)` : "Nenhum urgente"}
          icon={<Inbox className="size-4" />}
          tone={o.criticalCases ? "danger" : o.openCases ? "warning" : "success"}
        />
      </Link>
      <Link href="/painel/compensacoes">
        <StatCard
          label="Compensações pendentes"
          value={o.pendingCompensations}
          hint="Fase 1: todas passam por você"
          icon={<Gift className="size-4" />}
          tone={o.pendingCompensations ? "warning" : "success"}
        />
      </Link>
      <StatCard
        label="Resolvidos sem você"
        value={pct(o.resolvedWithoutOwnerRate)}
        hint="Últimos 30 dias · meta 70%"
        icon={<Bot className="size-4" />}
        tone={(o.resolvedWithoutOwnerRate ?? 0) >= 0.7 ? "success" : "default"}
      />
      <StatCard
        label="Tempo para resolver"
        value={o.medianMinutes === null ? "—" : `${Math.round(o.medianMinutes)} min`}
        hint={`Mediana · ${pct(o.within5Rate)} em até 5 min`}
        icon={<Timer className="size-4" />}
      />
    </div>
  );
}

async function StoreNow() {
  const user = await requireOwner();
  const [{ machines, terminal }, store] = await Promise.all([getMachinesFull(user.profile.store_id!), getStore()]);
  return <LiveStoreStatus machines={machines} terminal={terminal} internet={store.internet_status} />;
}

async function Notifications() {
  await connection();
  const user = await requireOwner();
  const [o, store] = await Promise.all([getOverview(user.profile.store_id!), getStore()]);
  const now = new Date();
  const delivered = o.notifications.filter((n) => Date.parse(n.deliver_at) <= now.getTime());
  const queued = o.notifications.filter((n) => Date.parse(n.deliver_at) > now.getTime());
  const nextSlot = nextNotificationAt(now, "normal", store.notify_hours, store.timezone);
  const unread = delivered.filter((n) => !n.read_at).length;

  return (
    <GlassCard tone="strong" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
        <h2 id="avisos" className="flex items-center gap-2 font-semibold">
          <Bell className="size-4" aria-hidden /> Avisos (WhatsApp simulado)
        </h2>
        {unread ? <MarkReadButton /> : null}
      </div>
      <div className="bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
        Não urgentes chegam agrupados às {store.notify_hours.map((h) => `${h}h`).join(", ")}. Próximo lote{" "}
        {describeSlot(now, nextSlot, store.timezone)}
        {queued.length ? ` com ${queued.length} caso(s)` : ""}.
      </div>
      <ul className="max-h-[26rem] divide-y divide-border/60 overflow-y-auto">
        {delivered.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">Nenhum aviso entregue ainda.</li>
        ) : (
          delivered.map((n) => (
            <li key={n.id}>
              <Link href={n.case_id ? `/painel/casos/${n.case_id}` : "/painel/casos"} className="flex gap-3 p-4 hover:bg-muted/40">
                {n.priority === "critical" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className={n.read_at ? "text-sm" : "text-sm font-semibold"}>{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">
                    {new Date(n.deliver_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </GlassCard>
  );
}
