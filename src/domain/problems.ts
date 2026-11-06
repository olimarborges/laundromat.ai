import type { Priority } from "./notifications";

/** Os 10 problemas mais comuns relatados pelo lojista (resposta da seção 10). */
export const PROBLEM_TYPES = [
  "liberacao_demorada",
  "erro_porta",
  "sem_sabao",
  "maquininha_travada",
  "pelos_animais",
  "secagem_insuficiente",
  "nao_iniciou",
  "roupa_esquecida",
  "servico_errado",
  "sem_internet",
  "outro",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export type Check = "payment" | "machine_log" | "camera";

export interface ProblemDefinition {
  id: ProblemType;
  /** Texto do chip (curto, na voz do cliente). */
  chip: string;
  title: string;
  /** Ícone lucide (nome do componente). */
  icon: string;
  /** Precisa saber qual máquina? */
  needsMachine: boolean;
  /** Conferências que o atendente faz antes de concluir. */
  checks: Check[];
  /** Pode gerar compensação (com as 3 conferências). */
  compensable: boolean;
  /** Prioridade padrão se precisar chamar o lojista. */
  priority: Priority;
  /** Passos guiados (modo roteiro e base para a IA). */
  steps: string[];
  /** Quando escalar para o lojista. */
  escalateWhen: string;
}

export const PROBLEMS: Record<ProblemType, ProblemDefinition> = {
  liberacao_demorada: {
    id: "liberacao_demorada",
    chip: "Paguei e a máquina não liberou",
    title: "Demora na liberação após o pagamento",
    icon: "Hourglass",
    needsMachine: true,
    checks: ["payment", "machine_log", "camera"],
    compensable: true,
    priority: "normal",
    steps: [
      "Depois do pagamento aprovado, a liberação pode levar até 2 minutos. Aguarde o painel da máquina acender.",
      "Confira se você pagou na máquina certa: o número aparece no comprovante da maquininha.",
      "Se passou de 2 minutos, eu confiro o pagamento e o registro da máquina para você.",
    ],
    escalateWhen: "Pagamento aprovado e a máquina sem liberação há mais de 5 minutos.",
  },
  erro_porta: {
    id: "erro_porta",
    chip: "Erro na porta / não trava",
    title: "Erro de travamento da porta",
    icon: "DoorClosed",
    needsMachine: true,
    checks: ["machine_log", "camera"],
    compensable: true,
    priority: "normal",
    steps: [
      "Abra a porta, confira se nenhuma peça de roupa ficou presa na borracha da vedação.",
      "Feche a porta com firmeza até ouvir o clique.",
      "Aperte iniciar novamente. Se o erro continuar, eu verifico o registro da máquina.",
    ],
    escalateWhen: "Erro de porta persistente após fechar corretamente.",
  },
  sem_sabao: {
    id: "sem_sabao",
    chip: "A máquina não usou sabão",
    title: "Reclamação de ausência de sabão",
    icon: "Droplets",
    needsMachine: true,
    checks: ["machine_log", "camera"],
    compensable: false,
    priority: "normal",
    steps: [
      "O sabão e o amaciante são dosados automaticamente em etapas do ciclo; é normal não ver espuma no início.",
      "Lavadoras de alta eficiência fazem pouca espuma de propósito.",
      "Se ao final as roupas estiverem sem cheiro de limpeza, eu registro para o lojista verificar a dosagem.",
    ],
    escalateWhen: "Cliente confirma ao final do ciclo que não houve dosagem.",
  },
  maquininha_travada: {
    id: "maquininha_travada",
    chip: "A maquininha travou",
    title: "Maquininha de pagamento travada",
    icon: "CreditCard",
    needsMachine: false,
    checks: ["payment"],
    compensable: false,
    priority: "normal",
    steps: [
      "Segure o botão de ligar na lateral da maquininha por cerca de 10 segundos até ela desligar.",
      "Aguarde 5 segundos e segure o mesmo botão de novo para ligar.",
      "Espere a tela inicial aparecer (cerca de 1 minuto) e tente pagar outra vez.",
      "Antes de pagar de novo, eu confiro se a primeira cobrança passou, para evitar cobrança em dobro.",
    ],
    escalateWhen: "A maquininha não volta após reiniciar ou trava várias vezes seguidas.",
  },
  pelos_animais: {
    id: "pelos_animais",
    chip: "Tem pelo de animal na máquina",
    title: "Pelos de animais na máquina",
    icon: "PawPrint",
    needsMachine: true,
    checks: ["camera"],
    compensable: false,
    priority: "normal",
    steps: [
      "Sentimos muito. A lavagem de itens de animais é proibida na loja.",
      "Se puder, use outra máquina livre; eu indico qual.",
      "Tire uma foto do tambor: eu registro e o lojista providencia a limpeza.",
    ],
    escalateWhen: "Sempre registrar para o lojista (higiene).",
  },
  secagem_insuficiente: {
    id: "secagem_insuficiente",
    chip: "A roupa não secou",
    title: "Secagem insuficiente",
    icon: "Wind",
    needsMachine: true,
    checks: ["machine_log"],
    compensable: false,
    priority: "normal",
    steps: [
      "Use o cesto medidor: colocar mais roupa do que ele comporta impede o ar quente de circular.",
      "Para roupas grossas (toalhas, jeans, edredom), escolha temperatura ALTA.",
      "Se sobrar umidade, um ciclo extra curto costuma resolver.",
    ],
    escalateWhen: "Secadora sem aquecer (registro indica falha).",
  },
  nao_iniciou: {
    id: "nao_iniciou",
    chip: "Paguei mas não começou",
    title: "Cliente não iniciou o ciclo",
    icon: "PlayCircle",
    needsMachine: true,
    checks: ["machine_log"],
    compensable: false,
    priority: "normal",
    steps: [
      "Depois de liberar, é preciso escolher o programa e apertar o botão INICIAR no painel da máquina.",
      "Confira se a porta está bem fechada.",
      "A liberação fica ativa por alguns minutos; se expirar, eu verifico para você.",
    ],
    escalateWhen: "Liberação expirou sem início.",
  },
  roupa_esquecida: {
    id: "roupa_esquecida",
    chip: "Tem roupa esquecida na máquina",
    title: "Roupas esquecidas na máquina",
    icon: "Shirt",
    needsMachine: true,
    checks: ["machine_log", "camera"],
    compensable: false,
    priority: "normal",
    steps: [
      "Se o ciclo já terminou, você pode retirar as roupas com cuidado e colocá-las na bancada.",
      "Se as roupas são suas e a loja está fechando, venha antes do horário em que a porta tranca.",
      "Eu aviso o dono da roupa quando ele tiver deixado o celular no atendimento.",
    ],
    escalateWhen: "Roupas presas com a loja perto de fechar.",
  },
  servico_errado: {
    id: "servico_errado",
    chip: "Paguei o serviço errado",
    title: "Pagamento do serviço errado (lavadora × secadora)",
    icon: "ArrowLeftRight",
    needsMachine: true,
    checks: ["payment", "machine_log"],
    compensable: true,
    priority: "normal",
    steps: [
      "Não inicie o ciclo pago por engano.",
      "Eu confiro o pagamento e peço ao lojista para liberar o serviço correto.",
      "Se houver outro cliente na loja, você pode oferecer o ciclo pago a ele.",
    ],
    escalateWhen: "Sempre: a troca precisa do lojista no Cicclo (sem cancelamento automático).",
  },
  sem_internet: {
    id: "sem_internet",
    chip: "Nada funciona / sem internet",
    title: "Queda de internet na loja",
    icon: "WifiOff",
    needsMachine: false,
    checks: ["payment", "machine_log"],
    compensable: false,
    priority: "critical",
    steps: [
      "Pode ser uma queda de internet da loja; as máquinas dependem dela para liberar.",
      "Não faça novos pagamentos por enquanto.",
      "Já avisei o lojista com prioridade.",
    ],
    escalateWhen: "Imediatamente (loja parada).",
  },
  outro: {
    id: "outro",
    chip: "Outro problema",
    title: "Outro problema",
    icon: "MessageCircleQuestion",
    needsMachine: false,
    checks: [],
    compensable: false,
    priority: "normal",
    steps: ["Me conte com suas palavras o que aconteceu."],
    escalateWhen: "Quando não houver resposta na base de conhecimento.",
  },
};

export const PROBLEM_LIST = PROBLEM_TYPES.map((id) => PROBLEMS[id]);

export function isProblemType(value: unknown): value is ProblemType {
  return typeof value === "string" && (PROBLEM_TYPES as readonly string[]).includes(value);
}

// ───────────────────────────── Problemas por lavanderia ─────────────────────────────

/**
 * Problema como a loja enxerga: da plataforma (slug, com conferências automáticas)
 * ou criado pelo dono (key "custom:<uuid>", só orientação + aviso ao lojista).
 */
export interface StoreProblem {
  /** Identificador usado em conversas/casos: slug da plataforma ou "custom:<uuid>". */
  key: string;
  /** id no catálogo (null para "outro"). */
  id: string | null;
  builtin: boolean;
  chip: string;
  title: string;
  icon: string;
  needsMachine: boolean;
  checks: Check[];
  compensable: boolean;
  priority: Priority;
  steps: string[];
  escalateWhen: string;
  /** Sempre registrar caso para o lojista (problemas próprios marcados assim). */
  alwaysNotify: boolean;
}

export const CUSTOM_PREFIX = "custom:";

export function fromDefinition(def: ProblemDefinition): StoreProblem {
  return {
    key: def.id,
    id: null,
    builtin: def.id !== "outro",
    chip: def.chip,
    title: def.title,
    icon: def.icon,
    needsMachine: def.needsMachine,
    checks: def.checks,
    compensable: def.compensable,
    priority: def.priority,
    steps: def.steps,
    escalateWhen: def.escalateWhen,
    alwaysNotify: false,
  };
}

/** "Outro problema" existe em toda loja (não aparece no catálogo). */
export const OTHER_PROBLEM: StoreProblem = fromDefinition(PROBLEMS.outro);

/** Solução em texto (um passo por linha) → passos. */
export function solutionToSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•])\s*/, "").trim())
    .filter(Boolean);
}

/** Ícones que o dono pode escolher para os problemas dele. */
export const PROBLEM_ICONS = [
  "MessageCircleQuestion",
  "Hourglass",
  "DoorClosed",
  "Droplets",
  "CreditCard",
  "PawPrint",
  "Wind",
  "PlayCircle",
  "Shirt",
  "ArrowLeftRight",
  "WifiOff",
] as const;

/** Atalho mostrado ao cliente (serializável para componentes do navegador). */
export interface ProblemChip {
  key: string;
  chip: string;
  icon: string;
}

export function toChip(p: StoreProblem): ProblemChip {
  return { key: p.key, chip: p.chip, icon: p.icon };
}
