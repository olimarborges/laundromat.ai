import "server-only";
import { PROBLEM_LIST, PROBLEMS, type ProblemType } from "@/domain/problems";
import { labelCheck } from "@/domain/compensation";
import { describeSlot } from "@/domain/notifications";
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
import type { AssistantContext } from "./tools";

/**
 * Modo roteiro: atendimento guiado sem IA (quando não há ANTHROPIC_API_KEY).
 * Usa o mesmo catálogo, as mesmas conferências e a mesma política.
 */

const KEYWORDS: Array<[ProblemType, RegExp]> = [
  ["sem_internet", /internet|nada funciona|tudo parado|wi-?fi/i],
  ["maquininha_travada", /maquininha|travou|cart[aã]o|stone|terminal/i],
  ["servico_errado", /errad|troquei|secadora.*lavadora|lavadora.*secadora/i],
  ["erro_porta", /porta|trava|tranca/i],
  ["sem_sabao", /sab[aã]o|espuma|amaciante/i],
  ["pelos_animais", /pelo|cachorro|gato|animal/i],
  ["secagem_insuficiente", /n[aã]o secou|[uú]mid|molhad|secagem/i],
  ["roupa_esquecida", /esquecid|roupa (de outra|na m[aá]quina)|deixaram/i],
  ["nao_iniciou", /n[aã]o (come[cç]ou|iniciou)|apertar|iniciar/i],
  ["liberacao_demorada", /n[aã]o liberou|liber|paguei|pagamento/i],
];

export function detectProblem(text: string): ProblemType | null {
  const chip = PROBLEM_LIST.find((p) => p.chip.toLowerCase() === text.trim().toLowerCase());
  if (chip) return chip.id;
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id;
  return null;
}

const ICON = { confirmed: "✔", not_confirmed: "✖", unavailable: "–" } as const;

export async function scriptReply(ctx: AssistantContext, userText: string, isFirst: boolean): Promise<string> {
  const lines: string[] = [];
  const name = ctx.conversation.visitor_name?.split(" ")[0] ?? "";
  if (isFirst) lines.push(`Oi${name ? `, ${name}` : ""}! Sou o assistente virtual da ${ctx.store.name}.`);

  // Código de máquina na mensagem? (ex.: "L1")
  const code = userText.match(/\b([LS]\s?\d)\b/i)?.[1]?.replace(/\s/, "");
  let machine = ctx.machine;
  if (code) {
    const m = await getMachineByCode(ctx.store.id, code);
    if (m) {
      machine = m;
      await updateConversation(ctx.conversation.id, { machine_id: m.id });
    }
  }

  if (/resolveu|deu certo|funcionou|obrigad/i.test(userText)) {
    await resolveConversation(ctx.conversation.id, "assistant", "Resolvido no modo roteiro.");
    lines.push("Que bom! Atendimento encerrado. Se precisar, é só abrir de novo pelo QR Code.");
    if (!ctx.isCustomer) lines.push("Dica: criando uma conta você junta pontos e vê as máquinas livres antes de sair de casa.");
    return lines.join("\n\n");
  }

  const problem = detectProblem(userText) ?? (ctx.conversation.problem_type as ProblemType | null);

  if (!problem) {
    const kb = await searchKb(ctx.store.id, userText, 1);
    if (kb[0]) {
      lines.push(`**${kb[0].question}**\n${kb[0].answer}`);
      lines.push("Isso resolve? Se não, escolha um dos problemas abaixo.");
    } else {
      lines.push("Me conte o que aconteceu ou escolha um dos problemas mais comuns abaixo.");
    }
    return lines.join("\n\n");
  }

  const def = PROBLEMS[problem];
  await updateConversation(ctx.conversation.id, { problem_type: problem });

  if (def.needsMachine && !machine) {
    lines.push(`Entendi: ${def.title.toLowerCase()}. Qual é a máquina? O código está na etiqueta (ex.: L1, L2, S1, S2).`);
    return lines.join("\n\n");
  }

  lines.push(`Entendi: **${def.title}**${machine ? ` na ${machine.label}` : ""}. Vou conferir os fatos.`);
  const { evidence, verification } = await runChecks(ctx.store.id, machine, problem);
  const checkLines = def.checks
    .map((c) => {
      const e = evidence[c];
      return e ? `${ICON[e.status]} ${labelCheck(c)}: ${e.detail}` : null;
    })
    .filter(Boolean);
  if (checkLines.length) lines.push(checkLines.join("\n"));

  const confirmed = def.checks.length > 0 && def.checks.every((c) => verification[c] === "confirmed");
  const contradicted = def.checks.some((c) => verification[c] === "not_confirmed");

  if (confirmed && def.compensable) {
    const caseRow = await openCase({
      store: ctx.store,
      conversation: ctx.conversation,
      machine,
      problemType: problem,
      summary: `${def.title}${machine ? ` (${machine.code})` : ""}: falha confirmada por ${def.checks.map(labelCheck).join(", ")}.`,
      evidence,
      actionsTaken: ["Conferências automáticas", "Proposta de liberar a lavagem de novo"],
    });
    const comp = await proposeCompensation({
      store: ctx.store,
      conversation: ctx.conversation,
      caseRow,
      machine,
      kind: "reliberacao",
      verification,
    });
    if (comp.status === "executed") {
      lines.push("Falha confirmada. Liberei a máquina de novo, sem custo: escolha o programa e aperte **INICIAR**.");
    } else {
      if (!ctx.conversation.phone_verified) await issueOtp(comp.id);
      lines.push(
        `Falha confirmada. Pedi ao lojista para liberar a lavagem de novo, sem custo. Ele é avisado ${describeSlot(new Date(), new Date(caseRow.notify_at), ctx.store.timezone)}; acompanhe aqui nesta tela.`,
      );
      if (machine) {
        const alt = (await listFreeMachines(ctx.store.id)).find((m) => m.kind === machine!.kind && m.id !== machine!.id);
        if (alt) lines.push(`Enquanto isso, a ${alt.label} (${alt.code}) está livre.`);
      }
    }
    return lines.join("\n\n");
  }

  if (problem === "maquininha_travada") {
    lines.push(
      verification.payment === "confirmed"
        ? "Atenção: a última cobrança **passou**. Não pague de novo: se a máquina não liberar, eu chamo o lojista."
        : "Boa notícia: nenhuma cobrança passou, então pode pagar de novo sem risco de cobrança em dobro. Para destravar:",
    );
  } else if (contradicted) {
    lines.push("Pelas conferências, a máquina não apresentou falha. Tente assim:");
  }
  lines.push(def.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));

  const mustEscalate =
    problem === "sem_internet" ||
    problem === "pelos_animais" ||
    problem === "servico_errado" ||
    (problem === "erro_porta" && confirmed);
  if (mustEscalate) {
    const caseRow = await openCase({
      store: ctx.store,
      conversation: ctx.conversation,
      machine,
      problemType: problem,
      summary: `${def.title}${machine ? ` (${machine.code})` : ""}. ${checkLines.join(" ")}`,
      evidence,
      actionsTaken: ["Orientação com o passo a passo"],
      needsPhysical: problem === "sem_internet",
    });
    lines.push(
      caseRow.priority === "critical"
        ? "Já avisei o lojista com prioridade."
        : `Registrei o caso para o lojista (aviso ${describeSlot(new Date(), new Date(caseRow.notify_at), ctx.store.timezone)}).`,
    );
  } else {
    lines.push("Deu certo? Responda **resolveu** ou me conte o que aconteceu.");
  }
  return lines.join("\n\n");
}
