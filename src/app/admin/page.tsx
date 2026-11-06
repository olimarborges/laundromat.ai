import Link from "next/link";
import { ExternalLink, LayoutDashboard, Lightbulb, MapPin, Plus, Store, WashingMachine } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { PageTitle, StatCard } from "@/components/painel/ui";
import { OpenPanelButton } from "@/components/admin/open-panel-button";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreRow } from "@/server/types";

export const metadata = { title: "Lavanderias" };

type Row = StoreRow & { machines: { count: number }[]; cases: { count: number }[] };

export default async function AdminHome() {
  const db = createAdminClient();
  const { data } = await db
    .from("stores")
    .select("*, machines(count), cases(count)")
    .eq("cases.status", "waiting_owner")
    .order("created_at");
  const stores = (data ?? []) as Row[];
  const { count: pendingSuggestions } = await db
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "pending");
  const active = stores.filter((s) => s.active).length;
  const machines = stores.reduce((n, s) => n + (s.machines[0]?.count ?? 0), 0);
  const noOwner = stores.filter((s) => !s.owner_email).length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Lavanderias"
        description="Cadastre lavanderias, marque no mapa e dê acesso aos donos."
        action={
          <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sugestoes"
            className="inline-flex h-11 items-center gap-2 rounded-xl border bg-background/60 px-4 font-medium"
          >
            <Lightbulb className="size-4" aria-hidden /> Sugestões
            {pendingSuggestions ? (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{pendingSuggestions}</span>
            ) : null}
          </Link>
          <Link
            href="/admin/lojas/nova"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-md shadow-primary/25"
          >
            <Plus className="size-4" aria-hidden /> Nova lavanderia
          </Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lavanderias" value={stores.length} hint={`${active} ativas`} icon={<Store className="size-4" />} />
        <StatCard label="Máquinas" value={machines} hint="Somando todas" icon={<WashingMachine className="size-4" />} />
        <StatCard label="Sem dono" value={noOwner} hint="Sem e-mail de acesso" icon={<LayoutDashboard className="size-4" />} tone={noOwner ? "warning" : "success"} />
        <StatCard label="No mapa" value={stores.filter((s) => s.lat !== null).length} hint="Com localização" icon={<MapPin className="size-4" />} />
      </div>

      <GlassCard tone="strong" padding="none" className="divide-y divide-border/60 overflow-hidden">
        {stores.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua to-primary text-sm font-bold text-white">
              {s.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/lojas/${s.id}`} className="truncate font-semibold hover:underline">
                  {s.name}
                </Link>
                {!s.active ? <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium">Inativa</span> : null}
                {!s.lat ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.7rem] font-medium text-warning">Sem mapa</span> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                /{s.slug} · {s.city ?? "cidade não informada"} · {s.machines[0]?.count ?? 0} máquinas ·{" "}
                {s.owner_email ?? "sem dono"}
                {s.cases[0]?.count ? ` · ${s.cases[0].count} caso(s) aguardando` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/${s.slug}`}
                target="_blank"
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted/60"
              >
                Ver <ExternalLink className="size-3.5" aria-hidden />
              </Link>
              <OpenPanelButton storeId={s.id} />
              <Link href={`/admin/lojas/${s.id}`} className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">
                Editar
              </Link>
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
