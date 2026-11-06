import "server-only";
import { tool, type InferUITools, type UIMessage, type UIDataTypes } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrations } from "@/server/integrations";
import {
  getMachineByCode,
  issueOtp,
  listFreeMachines,
  openCase,
  proposeCompensation,
  resolveConversation,
  runChecks,
  searchKb,
  updateConversation,
} from "@/server/support";
import { storeHours } from "@/server/store";
import { cycleFitsBeforeClose, getStoreStatus } from "@/domain/store-hours";
import { describeSlot } from "@/domain/notifications";
import { OTHER_PROBLEM, type StoreProblem } from "@/domain/problems";
import { effectiveStatus, minutesLeft, STATUS_LABEL } from "@/domain/machines";
import { labelKind } from "@/domain/compensation";
import type { CaseRow, ConversationRow, Evidence, MachineRow, StoreRow } from "@/server/types";
import type { Verification } from "@/domain/compensation";

export interface AssistantContext {
  store: StoreRow;
  conversation: ConversationRow;
  machine: MachineRow | null;
  isCustomer: boolean;
  /** Problemas ativos nesta lavanderia (escolhidos pelo dono) + "outro". */
  problems: StoreProblem[];
}

/**
 * Ferramentas do atendente. A IA decide QUANDO usar; as regras (conferências,
 * política de compensação, horários de aviso) ficam no código chamado aqui.
 */
export function makeTools(ctx: AssistantContext) {
  // Estado da conversa durante a requisição.
  let machine = ctx.machine;
  let lastChecks: { problem: StoreProblem; evidence: Evidence; verification: Verification } | null = null;
  // Só os problemas desta lavanderia são aceitos (a IA recebe a lista no prompt).
  const keys = ctx.problems.map((p) => p.key);
  const problemEnum = z
    .string()
    .describe(`Tipo do problema. Use exatamente uma destas chaves: ${keys.join(", ")}`);
  const findProblem = (key: string): StoreProblem => ctx.problems.find((p) => p.key === key) ?? OTHER_PROBLEM;
  let openedCase: CaseRow | null = null;

  async function resolveMachine(code?: string | null) {
    if (code) {
      const m = await getMachineByCode(ctx.store.id, code.trim());
      if (m) {
        machine = m;
        if (ctx.conversation.machine_id !== m.id) {
          await updateConversation(ctx.conversation.id, { machine_id: m.id });
        }
      }
    }
    return machine;
  }

  return {
    horario_loja: tool({
      description:
        "Informa se a loja está aberta, quanto falta para a porta trancar e se um ciclo de N minutos termina antes do fechamento.",
      inputSchema: z.object({
        duracao_ciclo_min: z.number().int().positive().optional().describe("Duração do ciclo que o cliente quer usar, em minutos."),
      }),
      execute: async ({ duracao_ciclo_min }) => {
        const hours = storeHours(ctx.store);
        const now = new Date();
        const status = getStoreStatus(now, hours);
        const fit = duracao_ciclo_min ? cycleFitsBeforeClose(now, duracao_ciclo_min, hours) : null;
        return {
          aberta: status.isOpen,
          situacao: status.label,
          detalhe: status.detail,
          horario: `${hours.openTime} às ${hours.closeTime}, todos os dias`,
          ciclo_cabe: fit?.fits ?? null,
          aviso_ciclo: fit?.message ?? null,
        };
      },
    }),

    consultar_maquina: tool({
      description: "Consulta o estado atual de uma máquina pelo código (ex.: L1, L2, S1, S2).",
      inputSchema: z.object({ codigo: z.string().describe("Código da máquina, como aparece na etiqueta/QR Code.") }),
      execute: async ({ codigo }) => {
        const m = await resolveMachine(codigo);
        if (!m) return { encontrada: false, mensagem: `Não encontrei a máquina "${codigo}".` };
        const now = new Date();
        const st = effectiveStatus(m, now);
        return {
          encontrada: true,
          codigo: m.code,
          nome: m.label,
          tipo: m.kind === "washer" ? "lavadora" : "secadora",
          estado: STATUS_LABEL[st],
          minutos_restantes: minutesLeft(m, now),
          erro: m.last_error,
          preco: m.price_cents / 100,
          duracao_ciclo_min: m.cycle_minutes,
        };
      },
    }),

    sugerir_maquina_livre: tool({
      description:
        "Sugere UMA máquina livre do mesmo tipo para o cliente usar no lugar de outra com problema. Não revela quantas pessoas há na loja.",
      inputSchema: z.object({ tipo: z.enum(["lavadora", "secadora"]) }),
      execute: async ({ tipo }) => {
        const kind = tipo === "lavadora" ? "washer" : "dryer";
        const free = (await listFreeMachines(ctx.store.id)).filter((m) => m.kind === kind && m.id !== machine?.id);
        if (free.length === 0) return { sugestao: null, mensagem: `Nenhuma ${tipo} livre agora.` };
        return { sugestao: free[0].code, nome: free[0].label };
      },
    }),

    conferir_fatos: tool({
      description:
        "Confere os fatos antes de concluir: pagamento (Stone), registro da máquina (Cicclo) e câmera, conforme o tipo de problema. Use SEMPRE antes de abrir caso ou propor compensação.",
      inputSchema: z.object({
        problema: problemEnum,
        codigo_maquina: z.string().optional(),
      }),
      execute: async ({ problema, codigo_maquina }) => {
        const m = await resolveMachine(codigo_maquina);
        const def = findProblem(problema);
        if (def.needsMachine && !m) {
          return { precisa_maquina: true, mensagem: "Pergunte ao cliente qual é a máquina (código na etiqueta, ex.: L1)." };
        }
        const { evidence, verification } = await runChecks(ctx.store.id, m, def);
        lastChecks = { problem: def, evidence, verification };
        await updateConversation(ctx.conversation.id, { problem_type: def.key });

        if (!def.builtin && def.key !== OTHER_PROBLEM.key) {
          // Problema cadastrado pelo dono: orientação da loja; registra caso quando ele pediu.
          return {
            problema: def.title,
            passos: def.steps,
            avisar_lojista_sempre: def.alwaysNotify,
            quando_chamar_lojista: def.escalateWhen,
          };
        }
        if (def.key === "maquininha_travada") {
          await createAdminClient().from("incidents").insert({
            store_id: ctx.store.id,
            kind: "terminal_frozen",
            notes: "Relatado pelo cliente no atendimento",
          });
          const terminal = await getIntegrations().payments.terminalStatus(ctx.store.id);
          return {
            conferencias: evidence,
            maquininha: terminal?.status ?? "desconhecido",
            passos: def.steps,
          };
        }
        if (def.key === "sem_internet" && ctx.store.internet_status === "offline") {
          return { conferencias: evidence, internet_da_loja: "fora do ar", passos: def.steps };
        }
        return {
          conferencias: evidence,
          falha_confirmada: def.checks.every((c) => verification[c] === "confirmed"),
          alguma_contradiz: def.checks.some((c) => verification[c] === "not_confirmed"),
          pode_compensar: def.compensable,
          passos: def.steps,
          quando_chamar_lojista: def.escalateWhen,
        };
      },
    }),

    buscar_base_conhecimento: tool({
      description: "Busca respostas aprovadas pelo lojista para dúvidas de uso, regras e problemas comuns.",
      inputSchema: z.object({ pergunta: z.string() }),
      execute: async ({ pergunta }) => {
        const found = await searchKb(ctx.store.id, pergunta);
        return { artigos: found.map((a) => ({ pergunta: a.question, resposta: a.answer })) };
      },
    }),

    abrir_caso: tool({
      description:
        "Encaminha o caso ao lojista pelo WhatsApp (resumo + provas). Use quando não der para resolver sozinho, quando a regra mandar, ou para pedir compensação. Crítico = loja parada, segurança ou roupa presa com a loja fechando.",
      inputSchema: z.object({
        problema: problemEnum,
        resumo: z.string().describe("Resumo objetivo para o lojista decidir sem perguntar nada ao cliente."),
        acoes_ja_tomadas: z.array(z.string()).describe("O que o atendente já orientou/fez."),
        precisa_presenca_fisica: z.boolean().default(false),
      }),
      execute: async ({ problema, resumo, acoes_ja_tomadas, precisa_presenca_fisica }) => {
        if (openedCase) return { ja_aberto: true, caso_id: openedCase.id };
        const def = findProblem(problema);
        const checks =
          lastChecks?.problem.key === def.key ? lastChecks : { problem: def, ...(await runChecks(ctx.store.id, machine, def)) };
        lastChecks = checks;
        openedCase = await openCase({
          store: ctx.store,
          conversation: ctx.conversation,
          machine,
          problem: def,
          summary: resumo,
          evidence: checks.evidence,
          actionsTaken: acoes_ja_tomadas,
          needsPhysical: precisa_presenca_fisica,
        });
        const quando = describeSlot(new Date(), new Date(openedCase.notify_at), ctx.store.timezone);
        return {
          caso_id: openedCase.id,
          prioridade: openedCase.priority === "critical" ? "urgente" : "normal",
          lojista_sera_avisado: quando,
        };
      },
    }),

    propor_compensacao: tool({
      description:
        "Propõe compensar o cliente (liberar a lavagem de novo, crédito ou estorno). Só depois de conferir_fatos. Quem decide é a política da loja: na fase 1 o lojista aprova tudo.",
      inputSchema: z.object({
        tipo: z.enum(["reliberacao", "credito", "estorno"]),
        motivo: z.string(),
      }),
      execute: async ({ tipo, motivo }) => {
        if (!lastChecks) return { erro: "Rode conferir_fatos antes de propor compensação." };
        if (!openedCase) {
          openedCase = await openCase({
            store: ctx.store,
            conversation: ctx.conversation,
            machine,
            problem: lastChecks.problem,
            summary: motivo,
            evidence: lastChecks.evidence,
            actionsTaken: [`Proposta: ${labelKind(tipo)}`],
          });
        }
        const comp = await proposeCompensation({
          store: ctx.store,
          conversation: ctx.conversation,
          caseRow: openedCase,
          problem: lastChecks.problem,
          machine,
          kind: tipo,
          verification: lastChecks.verification,
        });
        let codigo_simulado: string | null = null;
        if (comp.status === "pending" && !ctx.conversation.phone_verified) {
          codigo_simulado = await issueOtp(comp.id);
        }
        return {
          status: comp.status,
          decisao: comp.decision,
          motivos: comp.decision_reasons,
          codigo_enviado_por_sms: codigo_simulado ? "sim (simulado no protótipo; aparece na tela do cliente)" : "não",
          proximo_passo:
            comp.status === "executed"
              ? "Máquina liberada sem custo. Peça para o cliente apertar INICIAR."
              : comp.status === "pending"
                ? "Aguardando aprovação do lojista. O cliente acompanha nesta tela."
                : "Compensação não aprovada: as conferências não confirmaram a falha.",
        };
      },
    }),

    encerrar_atendimento: tool({
      description: "Marca o atendimento como resolvido pelo assistente quando o cliente confirmar que deu certo.",
      inputSchema: z.object({ resumo: z.string() }),
      execute: async ({ resumo }) => {
        if (openedCase) return { encerrado: false, motivo: "Há um caso aberto aguardando o lojista." };
        await resolveConversation(ctx.conversation.id, "assistant", resumo);
        return { encerrado: true, convidar_para_conta: !ctx.isCustomer };
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof makeTools>;
export type AssistantUIMessage = UIMessage<never, UIDataTypes, InferUITools<AssistantTools>>;
