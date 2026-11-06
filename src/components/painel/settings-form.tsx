"use client";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { saveSettings } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/glass-card";
import type { StoreRow } from "@/server/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export function SettingsForm({ store }: { store: StoreRow }) {
  const [phase, setPhase] = useState<1 | 2>(store.pilot_phase);
  const [notify, setNotify] = useState<number[]>(store.notify_hours);
  const [pending, start] = useTransition();
  const reais = (c: number) => (c / 100).toFixed(2);

  return (
    <form
      className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const cents = (k: string) => Math.round(Number(String(f.get(k)).replace(",", ".")) * 100);
        start(async () => {
          const r = await saveSettings({
            open_time: String(f.get("open_time")),
            close_time: String(f.get("close_time")),
            owner_whatsapp: String(f.get("owner_whatsapp") ?? ""),
            pilot_phase: phase,
            notify_hours: notify,
            maxPerCaseCents: cents("maxPerCase"),
            maxPerCustomerPerDayCents: cents("maxPerCustomer"),
            maxPerStorePerDayCents: cents("maxPerStore"),
          });
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <h2 className="font-semibold">Loja</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="open_time">Abre</Label>
            <Input id="open_time" name="open_time" type="time" defaultValue={store.open_time.slice(0, 5)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="close_time">Fecha (porta tranca)</Label>
            <Input id="close_time" name="close_time" type="time" defaultValue={store.close_time.slice(0, 5)} className="h-11" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="owner_whatsapp">Seu WhatsApp (para os avisos)</Label>
          <Input
            id="owner_whatsapp"
            name="owner_whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={store.owner_whatsapp ?? ""}
            placeholder="51999999999"
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">No protótipo os avisos aparecem no painel (WhatsApp simulado).</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Horários dos avisos não urgentes</legend>
          <div className="flex flex-wrap gap-1.5">
            {HOURS.map((h) => {
              const on = notify.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setNotify((n) => (on ? n.filter((x) => x !== h) : [...n, h].sort((a, b) => a - b)))}
                  className={cn(
                    "h-10 min-w-12 rounded-xl border px-2 text-sm font-medium tabular-nums transition",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background/60",
                  )}
                >
                  {h}h
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Urgentes (loja parada, segurança) chegam na hora.</p>
        </fieldset>
      </GlassCard>

      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <h2 className="font-semibold">Compensações</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fase do piloto">
          {([1, 2] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={phase === p}
              onClick={() => setPhase(p)}
              className={cn(
                "rounded-2xl border p-3 text-left transition",
                phase === p ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "bg-background/50",
              )}
            >
              <p className="text-sm font-semibold">Fase {p}</p>
              <p className="text-xs text-muted-foreground">
                {p === 1 ? "Toda compensação passa por você" : "Automática dentro dos limites"}
              </p>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="maxPerCase">Por caso (R$)</Label>
            <Input id="maxPerCase" name="maxPerCase" inputMode="decimal" defaultValue={reais(store.policy.maxPerCaseCents)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="maxPerCustomer">Por cliente/dia (R$)</Label>
            <Input id="maxPerCustomer" name="maxPerCustomer" inputMode="decimal" defaultValue={reais(store.policy.maxPerCustomerPerDayCents)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="maxPerStore">Loja/dia (R$)</Label>
            <Input id="maxPerStore" name="maxPerStore" inputMode="decimal" defaultValue={reais(store.policy.maxPerStorePerDayCents)} className="h-11" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Mesmo na fase 2, só compensa com a falha confirmada pelas conferências e o celular do cliente confirmado. Estorno
          sempre com você.
        </p>
        <Button type="submit" disabled={pending} className="h-11 w-full">
          <Save className="size-4" /> Salvar configurações
        </Button>
      </GlassCard>
    </form>
  );
}
