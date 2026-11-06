"use client";
import Link from "next/link";
import { CreditCard, Wifi, WifiOff } from "lucide-react";
import { MachineTile, useNow } from "@/components/machine-tile";
import type { MachineRow, TerminalRow } from "@/server/types";
import { cn } from "@/lib/utils";

/** Grade das máquinas + maquininha + internet (atualizada pelo PanelRealtime via refresh). */
export function LiveStoreStatus({
  machines,
  terminal,
  internet,
}: {
  machines: MachineRow[];
  terminal: TerminalRow | null;
  internet: "online" | "offline";
}) {
  const now = useNow();
  const terminalLabel = terminal?.status === "ok" ? "Funcionando" : terminal?.status === "frozen" ? "Travada" : "Sem conexão";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "glass flex items-center gap-3 rounded-2xl p-3",
            internet === "offline" && "ring-2 ring-destructive/50",
          )}
        >
          {internet === "online" ? (
            <Wifi className="size-5 text-success" aria-hidden />
          ) : (
            <WifiOff className="size-5 text-destructive" aria-hidden />
          )}
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Internet da loja</p>
            <p className="text-sm font-semibold">{internet === "online" ? "Online" : "Fora do ar"}</p>
          </div>
        </div>
        <div className={cn("glass flex items-center gap-3 rounded-2xl p-3", terminal?.status !== "ok" && "ring-2 ring-warning/60")}>
          <CreditCard className={cn("size-5", terminal?.status === "ok" ? "text-success" : "text-warning")} aria-hidden />
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Maquininha {terminal?.provider}</p>
            <p className="text-sm font-semibold">{terminalLabel}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {machines.map((m) => (
          <Link key={m.id} href="/painel/maquinas" className="block">
            <MachineTile machine={m} now={now} detailed />
          </Link>
        ))}
      </div>
    </div>
  );
}
