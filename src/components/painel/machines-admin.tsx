"use client";
import { useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RotateCcw, Unlock } from "lucide-react";
import { toast } from "sonner";
import { clearMachineError, releaseMachineAction } from "@/app/painel/actions";
import { MachineTile, useNow } from "@/components/machine-tile";
import { Button } from "@/components/ui/button";
import type { MachineRow } from "@/server/types";

export function MachinesAdmin({ machines, storeUrl }: { machines: MachineRow[]; storeUrl: string }) {
  const now = useNow();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {machines.map((m) => (
          <MachineTile key={m.id} machine={m} now={now} detailed>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-10" disabled={pending} onClick={() => run(() => releaseMachineAction(m.id))}>
                <Unlock className="size-3.5" /> Liberar
              </Button>
              <Button variant="ghost" size="sm" className="h-10" disabled={pending} onClick={() => run(() => clearMachineError(m.id))}>
                <RotateCcw className="size-3.5" /> Normalizar
              </Button>
            </div>
          </MachineTile>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-semibold">QR Codes para colar nas máquinas</h2>
            <p className="text-sm text-muted-foreground">Cada código abre o atendimento já com a máquina escolhida.</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="h-10 print:hidden">
            <Printer className="size-4" /> Imprimir
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-2">
          {[...machines.map((m) => ({ code: m.code, label: m.label, url: `${storeUrl}/m/${m.code}` })), { code: "LOJA", label: "Atendimento geral", url: storeUrl }].map(
            (q) => (
              <figure key={q.code} className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center text-slate-900 shadow-sm ring-1 ring-slate-200 break-inside-avoid">
                <QRCodeSVG value={q.url} size={148} level="M" marginSize={0} fgColor="#0f172a" />
                <figcaption className="space-y-0.5">
                  <p className="text-lg font-bold">{q.code}</p>
                  <p className="text-xs">{q.label}</p>
                  <p className="text-[0.65rem] text-slate-500">Problema? Aponte a câmera do celular</p>
                </figcaption>
              </figure>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
