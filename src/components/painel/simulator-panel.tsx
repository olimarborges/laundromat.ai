"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeftRight,
  CreditCard,
  DoorClosed,
  Hourglass,
  Loader2,
  PawPrint,
  PlayCircle,
  RotateCcw,
  Shirt,
  Smartphone,
  Timer,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { simulate } from "@/app/painel/actions";
import type { ScenarioId } from "@/server/simulator";
import { cn } from "@/lib/utils";

const ICONS: Record<ScenarioId, React.ComponentType<{ className?: string }>> = {
  liberacao_demorada: Hourglass,
  erro_porta: DoorClosed,
  nao_iniciou: PlayCircle,
  servico_errado: ArrowLeftRight,
  roupa_esquecida: Shirt,
  pelos_animais: PawPrint,
  ciclo_curto: Timer,
  maquininha_travada: CreditCard,
  sem_internet: WifiOff,
  reset: RotateCcw,
};

export function SimulatorPanel({
  storeSlug,
  scenarios,
  machines,
}: {
  storeSlug: string;
  scenarios: { id: ScenarioId; title: string; description: string; needsMachine: boolean }[];
  machines: { code: string; label: string }[];
}) {
  const [machine, setMachine] = useState(machines[0]?.code ?? "");
  const [running, setRunning] = useState<ScenarioId | null>(null);
  const [, start] = useTransition();

  const run = (id: ScenarioId, needsMachine: boolean) => {
    setRunning(id);
    start(async () => {
      const r = await simulate(id, needsMachine ? machine : undefined);
      setRunning(null);
      if (r.ok) toast.success(r.message, { description: needsMachine ? "Agora abra o atendimento pelo QR Code dessa máquina." : undefined });
      else toast.error(r.message);
    });
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong flex flex-wrap items-center gap-3 rounded-3xl p-4">
        <span className="text-sm font-medium">Máquina:</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Máquina do cenário">
          {machines.map((m) => (
            <button
              key={m.code}
              type="button"
              role="radio"
              aria-checked={machine === m.code}
              onClick={() => setMachine(m.code)}
              className={cn(
                "h-11 min-w-14 rounded-xl border px-3 text-sm font-semibold transition active:scale-95",
                machine === m.code ? "border-primary bg-primary text-primary-foreground" : "bg-background/60",
              )}
            >
              {m.code}
            </button>
          ))}
        </div>
        <Link
          href={`/${storeSlug}/m/${machine}`}
          target="_blank"
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-medium text-accent-foreground"
        >
          <Smartphone className="size-4" aria-hidden /> Abrir como cliente ({machine})
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((s, i) => {
          const Icon = ICONS[s.id];
          const busy = running === s.id;
          return (
            <motion.button
              key={s.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              disabled={running !== null}
              onClick={() => run(s.id, s.needsMachine)}
              className={cn(
                "glass glass-sheen flex items-start gap-3 rounded-3xl p-4 text-left transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60",
                s.id === "reset" && "ring-1 ring-success/40",
                s.id === "sem_internet" && "ring-1 ring-destructive/30",
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                  s.id === "reset" ? "bg-success/12 text-success" : s.id === "sem_internet" ? "bg-destructive/12 text-destructive" : "bg-primary/10 text-primary",
                )}
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {s.title}
                  {s.needsMachine ? <span className="font-normal text-muted-foreground"> · {machine}</span> : null}
                </span>
                <span className="block text-xs text-muted-foreground">{s.description}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
