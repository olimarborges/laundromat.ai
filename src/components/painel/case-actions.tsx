"use client";
import { useState, useTransition } from "react";
import { Check, MessageCircle, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import { decideCompensation, releaseMachineAction, resolveCase } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, labelKind, type CompensationKind } from "@/domain/compensation";

export function CompensationDecision({
  id,
  kind,
  amountCents,
  reasons,
}: {
  id: string;
  kind: CompensationKind;
  amountCents: number;
  reasons: string[];
}) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const decide = (approve: boolean) =>
    start(async () => {
      const r = await decideCompensation(id, approve, note);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  return (
    <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/8 p-4">
      <div>
        <p className="text-sm font-semibold">
          Proposta do atendente: {labelKind(kind)} {amountCents ? `(${formatBRL(amountCents)})` : ""}
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Recado para o cliente (opcional)"
        className="h-11 bg-background/70"
        aria-label="Recado para o cliente"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-11" disabled={pending} onClick={() => decide(true)}>
          <Check className="size-4" /> Aprovar
        </Button>
        <Button variant="outline" className="h-11" disabled={pending} onClick={() => decide(false)}>
          <X className="size-4" /> Recusar
        </Button>
      </div>
    </div>
  );
}

export function CaseToolbar({
  caseId,
  machineId,
  machineCode,
  customerPhone,
  customerName,
  summary,
  resolved,
}: {
  caseId: string;
  machineId: string | null;
  machineCode: string | null;
  customerPhone: string | null;
  customerName: string | null;
  summary: string;
  resolved: boolean;
}) {
  const [resolution, setResolution] = useState("");
  const [pending, start] = useTransition();
  const wa = customerPhone
    ? `https://wa.me/55${customerPhone}?text=${encodeURIComponent(
        `Olá${customerName ? `, ${customerName}` : ""}! Aqui é da EasyWash, sobre o seu atendimento: ${summary.slice(0, 200)}`,
      )}`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {machineId ? (
          <Button
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await releaseMachineAction(machineId);
                if (r.ok) toast.success(r.message);
                else toast.error(r.message);
              })
            }
          >
            <Unlock className="size-4" /> Liberar {machineCode} sem custo
          </Button>
        ) : null}
        {wa ? (
          <Button variant="outline" className="h-11" asChild>
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> Falar com o cliente no WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
      {!resolved ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await resolveCase(caseId, resolution);
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            });
          }}
        >
          <Textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Como foi resolvido? (o cliente vê esta mensagem)"
            className="min-h-20 bg-background/70"
            aria-label="Resolução do caso"
          />
          <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
            <Check className="size-4" /> Marcar caso como resolvido
          </Button>
        </form>
      ) : null}
    </div>
  );
}
