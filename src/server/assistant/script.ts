import "server-only";
import type { ProblemType, StoreProblem } from "@/domain/problems";
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

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Detecta o problema só entre os ativos da loja (chip exato → palavras-chave → título do problema próprio). */
export function detectProblem(text: string, problems: StoreProblem[]): StoreProblem | null {
  const t = plain(text);
  const byChip = problems.find((p) => plain(p.chip) === t || t.startsWith(plain(p.chip)));
  if (byChip) return byChip;
  for (const [id, re] of KEYWORDS) {
    if (!re.test(text)) continue;
    const p = problems.find((x) => x.key === id);
    if (p) return p;
  }
  // Problemas próprios do dono: maioria das palavras do título/chip na frase.
  for (const p of problems.filter((x) => !x.builtin && x.key !== "outro")) {
    const words = plain(`${p.title} ${p.chip}`).split(" ").filter((w) => w.length > 3);
    const hits = words.filter((w) => t.includes(w)).length;
    if (words.length && hits >= Math.max(1, Math.ceil(words.length / 2))) return p;
  }
  return null;
}

const ICON = { confirmed: "✔", not_confirmed: "✖", unavailable: "–" } as const;

export async function scriptReply(ctx: AssistantContext, userText: string, isFirst: boolean): Promise<string> {
  const lines: string[] = [];
  const name = ctx.conversation.visitor_name?.split(" ")[0] ?? "";
  if (isFirst) lines.push(`Oi${name ? `, ${name}` : ""}! Boas-vindas à ${ctx.store.name}. Sou o assistente virtual e estou aqui para ajudar no que precisar.`);

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

  const problem =
    detectProblem(userText, ctx.problems) ??
    ctx.problems.find((p) => p.key === ctx.conversation.problem_type && p.key !== "outro") ??
    null;

  if (!problem) {
    const kb = await searchKb(ctx.store.id, userText, 1);
    if (kb[0]) {
      lines.push(`**${kb[0].question}**\n${kb[0].answer}`);
      lines.push("Isso resolve? Se não, escolha um dos problemas abaixo.");
    } else {
      lines.push("Em que posso te ajudar? Me conte com suas palavras ou escolha um dos atalhos abaixo.");
    }
    return lines.join("\n\n");
  }

  const def = problem;
  await updateConversation(ctx.conversation.id, { problem_type: def.key });

  // Problema cadastrado pelo dono: mostra a solução da loja e avisa o lojista se ele pediu.
  if (!def.builtin) {
    lines.push(`Entendi: **${def.title}**. Veja como resolver:`);
    lines.push(def.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
    if (def.alwaysNotify) {
      const caseRow = await openCase({
        store: ctx.store,
        conversation: ctx.conversation,
        machine,
        problem: def,
        summary: `${def.title}${machine ? ` (${machine.code})` : ""}: cliente orientado com a solução da loja.`,
        evidence: {},
        actionsTaken: ["Orientação com a solução cadastrada pela loja"],
      });
      lines.push(
        caseRow.priority === "critical"
          ? "Já avisei o lojista com prioridade."
          : `Também registrei para o lojista (aviso ${describeSlot(new Date(), new Date(caseRow.notify_at), ctx.store.timezone)}).`,
      );
    } else {
      lines.push("Deu certo? Responda **resolveu** ou me conte o que aconteceu.");
    }
    return lines.join("\n\n");
  }

  if (def.needsMachine && !machine) {
    lines.push(`Entendi: ${def.title.toLowerCase()}. Qual é a máquina? O código está na etiqueta (ex.: L1, L2, S1, S2).`);
    return lines.join("\n\n");
  }

  lines.push(`Entendi: **${def.title}**${machine ? ` na ${machine.label}` : ""}. Vou conferir os fatos.`);
  const { evidence, verification } = await runChecks(ctx.store.id, machine, def);
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
      problem: def,
      summary: `${def.title}${machine ? ` (${machine.code})` : ""}: falha confirmada por ${def.checks.map(labelCheck).join(", ")}.`,
      evidence,
      actionsTaken: ["Conferências automáticas", "Proposta de liberar a lavagem de novo"],
    });
    const comp = await proposeCompensation({
      store: ctx.store,
      conversation: ctx.conversation,
      caseRow,
      problem: def,
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

  const key = def.key as ProblemType;
  if (key === "maquininha_travada") {
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
    key === "sem_internet" || key === "pelos_animais" || key === "servico_errado" || (key === "erro_porta" && confirmed);
  if (mustEscalate) {
    const caseRow = await openCase({
      store: ctx.store,
      conversation: ctx.conversation,
      machine,
      problem: def,
      summary: `${def.title}${machine ? ` (${machine.code})` : ""}. ${checkLines.join(" ")}`,
      evidence,
      actionsTaken: ["Orientação com o passo a passo"],
      needsPhysical: key === "sem_internet",
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
