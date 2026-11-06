"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Shirt, Timer, WashingMachine, WifiOff, Wind, Zap } from "lucide-react";
import { effectiveStatus, minutesLeft, STATUS_LABEL, type MachineStatus } from "@/domain/machines";
import type { MachineRow } from "@/server/types";
import { cn } from "@/lib/utils";

const TONE: Record<MachineStatus, string> = {
  free: "text-success bg-success/12",
  released: "text-primary bg-primary/12",
  running: "text-primary bg-primary/12",
  finished: "text-warning bg-warning/15",
  error: "text-destructive bg-destructive/12",
  offline: "text-muted-foreground bg-muted",
};

const STATUS_ICON: Record<MachineStatus, React.ComponentType<{ className?: string }>> = {
  free: CheckCircle2,
  released: Zap,
  running: Timer,
  finished: Shirt,
  error: AlertTriangle,
  offline: WifiOff,
};

/** Relógio que atualiza a cada 15 s (para minutos restantes). */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function MachineTile({
  machine,
  now,
  detailed = false,
  className,
  children,
}: {
  machine: MachineRow;
  now: Date;
  detailed?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const status = effectiveStatus(machine, now);
  const left = minutesLeft(machine, now);
  const Icon = machine.kind === "washer" ? WashingMachine : Wind;
  const StatusIcon = STATUS_ICON[status];
  const progress =
    status === "running" && machine.cycle_started_at && machine.cycle_ends_at
      ? Math.min(
          1,
          (now.getTime() - Date.parse(machine.cycle_started_at)) /
            (Date.parse(machine.cycle_ends_at) - Date.parse(machine.cycle_started_at)),
        )
      : status === "finished"
        ? 1
        : 0;

  return (
    <motion.div
      layout
      className={cn("@container glass glass-sheen relative flex flex-col gap-3 overflow-hidden rounded-3xl p-3.5 sm:p-4", className)}
    >
      {/* Cartão estreito (2 colunas no celular): selo vai para a linha de baixo, sem cortar. */}
      <div className="flex flex-col gap-2 @[15rem]:flex-row @[15rem]:items-start @[15rem]:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua/25 to-primary/25 text-primary @[15rem]:size-11">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-base font-semibold">{machine.code}</p>
            <p className="text-xs text-muted-foreground">
              {machine.kind === "washer" ? "Lavadora" : "Secadora"}
              {machine.capacity_kg ? ` · ${machine.capacity_kg} kg` : ""}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold whitespace-nowrap",
            TONE[status],
          )}
        >
          <StatusIcon className="size-3.5" aria-hidden />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {status === "running" ? (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso do ciclo da ${machine.code}`}>
            <motion.div className="h-full rounded-full bg-gradient-to-r from-aqua to-primary" animate={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">Faltam {left} min</p>
        </div>
      ) : null}

      {detailed && machine.last_error ? (
        <p className="rounded-xl bg-destructive/8 px-2.5 py-1.5 text-xs text-destructive">{machine.last_error}</p>
      ) : null}
      {detailed ? (
        <p className="text-[0.7rem] break-words text-muted-foreground">
          {machine.brand} {machine.model} · R$ {(machine.price_cents / 100).toFixed(2).replace(".", ",")} · {machine.cycle_minutes} min
        </p>
      ) : null}
      {children}
    </motion.div>
  );
}
