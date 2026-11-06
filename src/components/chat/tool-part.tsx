"use client";
import { motion } from "motion/react";
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Clock,
  Gift,
  Loader2,
  MinusCircle,
  Search,
  WashingMachine,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Check = { status: "confirmed" | "not_confirmed" | "unavailable"; detail: string };

const RUNNING_LABEL: Record<string, string> = {
  horario_loja: "Consultando o horário da loja",
  consultar_maquina: "Consultando a máquina",
  sugerir_maquina_livre: "Procurando uma máquina livre",
  conferir_fatos: "Conferindo pagamento, máquina e câmera",
  buscar_base_conhecimento: "Buscando nas respostas da loja",
  abrir_caso: "Preparando o caso para o lojista",
  propor_compensacao: "Analisando a compensação",
  encerrar_atendimento: "Encerrando o atendimento",
};

const CHECK_LABEL: Record<string, string> = { payment: "Pagamento", machine_log: "Registro da máquina", camera: "Câmera" };

export function ToolPart({
  name,
  state,
  output,
  errorText,
}: {
  name: string;
  state: string;
  output: unknown;
  errorText?: string;
}) {
  const running = state === "input-streaming" || state === "input-available";
  if (running) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {RUNNING_LABEL[name] ?? "Consultando"}…
      </div>
    );
  }
  if (state === "output-error") {
    return <p className="text-xs text-destructive">Não consegui consultar agora{errorText ? `: ${errorText}` : ""}.</p>;
  }
  if (state !== "output-available") return null;
  const out = (output ?? {}) as Record<string, unknown>;

  switch (name) {
    case "conferir_fatos": {
      const checks = (out.conferencias ?? {}) as Record<string, Check>;
      const entries = Object.entries(checks);
      if (entries.length === 0) return null;
      return (
        <ToolCard icon={<Search className="size-3.5" />} title="Conferência dos fatos">
          <ul className="space-y-1.5">
            {entries.map(([k, c], i) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2"
              >
                <CheckIcon status={c.status} />
                <span>
                  <span className="font-medium">{CHECK_LABEL[k] ?? k}:</span>{" "}
                  <span className="text-muted-foreground">{c.detail}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </ToolCard>
      );
    }
    case "abrir_caso": {
      const urgent = out.prioridade === "urgente";
      return (
        <ToolCard
          icon={<BellRing className="size-3.5" />}
          title={urgent ? "Lojista avisado com prioridade" : "Caso enviado ao lojista"}
          tone={urgent ? "warning" : "default"}
        >
          {urgent ? "Ele recebe o resumo e as provas agora." : `Ele recebe o resumo e as provas ${String(out.lojista_sera_avisado ?? "no próximo horário")}.`}
        </ToolCard>
      );
    }
    case "propor_compensacao": {
      const status = String(out.status ?? "");
      const title =
        status === "executed"
          ? "Lavagem liberada de novo, sem custo"
          : status === "pending"
            ? "Compensação aguardando o lojista"
            : status === "approved"
              ? "Compensação aprovada"
              : "Compensação não aprovada";
      return (
        <ToolCard
          icon={<Gift className="size-3.5" />}
          title={title}
          tone={status === "executed" || status === "approved" ? "success" : status === "pending" ? "default" : "muted"}
        >
          {String(out.proximo_passo ?? "")}
        </ToolCard>
      );
    }
    case "consultar_maquina": {
      if (!out.encontrada) return null;
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <WashingMachine className="size-3.5" aria-hidden />
          {String(out.nome)}: <span className="font-medium text-foreground">{String(out.estado)}</span>
          {out.minutos_restantes ? ` · faltam ${String(out.minutos_restantes)} min` : null}
        </div>
      );
    }
    case "horario_loja":
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden /> {String(out.detalhe ?? "")}
        </div>
      );
    case "buscar_base_conhecimento":
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" aria-hidden /> Consultei as respostas da loja
        </div>
      );
    default:
      return null;
  }
}

function CheckIcon({ status }: { status: Check["status"] }) {
  if (status === "confirmed") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Confirmado" />;
  if (status === "not_confirmed") return <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Não confirmado" />;
  return <MinusCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Sem dados" />;
}

function ToolCard({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-2xl border p-3 text-[0.8rem] leading-relaxed",
        tone === "success" && "border-success/30 bg-success/8",
        tone === "warning" && "border-warning/40 bg-warning/10",
        tone === "muted" && "border-border bg-muted/60",
        tone === "default" && "border-primary/20 bg-primary/6",
      )}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
        {icon ?? <CircleDashed className="size-3.5" />}
        {title}
      </p>
      <div>{children}</div>
    </motion.div>
  );
}
