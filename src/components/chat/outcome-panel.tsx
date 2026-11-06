"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, CheckCircle2, Hourglass, MessageSquareLock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { verifyOtp } from "@/app/(chat)/atendimento/[id]/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL, labelKind, type CompensationKind } from "@/domain/compensation";

export interface Outcome {
  status: string;
  phoneVerified: boolean;
  cases: { id: string; title: string; priority: string; status: string; notifyAt: string; resolution: string | null }[];
  compensations: {
    id: string;
    kind: CompensationKind;
    status: string;
    amountCents: number;
    ownerNote: string | null;
    otpVerified: boolean;
    simulatedSmsCode: string | null;
  }[];
}

/** Acompanha casos e compensações (o lojista aprova no painel → o cliente vê aqui). */
export function OutcomePanel({ conversationId, refreshKey }: { conversationId: string; refreshKey: number }) {
  const [data, setData] = useState<Outcome | null>(null);
  const prev = useRef<Outcome | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/atendimento/${conversationId}/status`, { cache: "no-store" });
      if (!res.ok || !alive) return;
      const next = (await res.json()) as Outcome;
      const before = prev.current?.compensations[0]?.status;
      const after = next.compensations[0]?.status;
      if (before === "pending" && (after === "executed" || after === "approved")) {
        toast.success("O lojista aprovou a sua compensação!");
        if ("vibrate" in navigator) navigator.vibrate?.(80);
      } else if (before === "pending" && after === "rejected") {
        toast.info("O lojista analisou o seu caso.");
      }
      prev.current = next;
      setData(next);
    };
    load();
    const t = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId, refreshKey]);

  const comp = data?.compensations[0];
  const kase = data?.cases[0];
  if (!comp && !kase) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong mx-3 mb-2 rounded-2xl p-3 text-sm"
        role="status"
        aria-live="polite"
      >
        {comp ? <CompensationStatus conversationId={conversationId} comp={comp} /> : kase ? <CaseStatus kase={kase} /> : null}
      </motion.div>
    </AnimatePresence>
  );
}

function CaseStatus({ kase }: { kase: Outcome["cases"][number] }) {
  const resolved = kase.status === "resolved";
  return (
    <div className="flex items-start gap-2.5">
      {resolved ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
      ) : (
        <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      )}
      <div>
        <p className="font-semibold">{resolved ? "O lojista resolveu o seu caso" : "Caso com o lojista"}</p>
        <p className="text-xs text-muted-foreground">
          {resolved
            ? (kase.resolution ?? "Obrigado pela paciência.")
            : kase.priority === "critical"
              ? "Avisado com prioridade."
              : `Aviso agendado para ${new Date(kase.notifyAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`}
        </p>
      </div>
    </div>
  );
}

function CompensationStatus({ conversationId, comp }: { conversationId: string; comp: Outcome["compensations"][number] }) {
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const icon =
    comp.status === "executed" || comp.status === "approved" ? (
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
    ) : comp.status === "rejected" ? (
      <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
    ) : (
      <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
    );
  const title =
    comp.status === "executed"
      ? "Liberado! Aperte INICIAR na máquina"
      : comp.status === "approved"
        ? "Compensação aprovada"
        : comp.status === "rejected"
          ? "Compensação não aprovada"
          : "Aguardando aprovação do lojista";

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        {icon}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {labelKind(comp.kind)}
            {comp.amountCents ? ` · ${formatBRL(comp.amountCents)}` : ""}
            {comp.ownerNote ? ` · “${comp.ownerNote}”` : ""}
          </p>
        </div>
      </div>
      {comp.simulatedSmsCode && !comp.otpVerified ? (
        <form
          className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await verifyOtp(conversationId, comp.id, code);
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            });
          }}
        >
          <p className="flex items-center gap-1.5 text-xs">
            <MessageSquareLock className="size-3.5" aria-hidden />
            Confirme seu celular com o código enviado por SMS.
          </p>
          <p className="text-[0.7rem] text-muted-foreground">
            Protótipo: SMS simulado, o código é <span className="font-mono font-semibold tracking-widest">{comp.simulatedSmsCode}</span>
          </p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-label="Código do SMS"
              className="h-10 bg-background/70 text-center font-mono tracking-[0.3em]"
            />
            <Button type="submit" disabled={pending || code.length < 6} className="h-10 px-4">
              Confirmar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
