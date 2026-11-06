import { formatHourShort, parseHHMM } from "./time";

/** Respostas iniciais de toda lavanderia nova (o dono revisa e ajusta no painel). */
export function kbTemplate(store: { name: string; open_time: string; close_time: string }) {
  const open = formatHourShort(parseHHMM(store.open_time.slice(0, 5)));
  const close = formatHourShort(parseHHMM(store.close_time.slice(0, 5)));
  return [
    {
      category: "Uso das máquinas",
      question: "Como usar a lavadora?",
      answer:
        "1) Coloque as roupas sem passar da linha do cesto medidor. 2) Pague na maquininha escolhendo o número da máquina. 3) Aguarde o painel acender (até 2 minutos). 4) Escolha o programa e aperte INICIAR. Sabão e amaciante são colocados automaticamente.",
      tags: ["lavadora", "uso", "iniciar"],
    },
    {
      category: "Uso das máquinas",
      question: "Como usar a secadora?",
      answer:
        "Use o cesto medidor: secadora cheia demais não seca. Para toalhas, jeans e edredons escolha temperatura ALTA; para roupas delicadas, MÉDIA ou BAIXA. Pague, aguarde liberar e aperte INICIAR.",
      tags: ["secadora", "temperatura", "cesto"],
    },
    {
      category: "Pagamento",
      question: "Paguei e a máquina não liberou. E agora?",
      answer:
        "A liberação pode levar até 2 minutos depois do pagamento aprovado. Confira se pagou na máquina certa (o número aparece no comprovante). Passou disso? Abra o atendimento que eu confiro o pagamento e o registro da máquina.",
      tags: ["pagamento", "liberacao"],
    },
    {
      category: "Pagamento",
      question: "A maquininha travou. Como reiniciar?",
      answer:
        "Segure o botão de ligar na lateral por cerca de 10 segundos até desligar, espere 5 segundos e ligue de novo. Aguarde a tela inicial (cerca de 1 minuto). Antes de pagar de novo, confira comigo se a primeira cobrança passou.",
      tags: ["maquininha", "reiniciar"],
    },
    {
      category: "Regras da loja",
      question: "Posso lavar itens de animais?",
      answer:
        "Não. A lavagem de caminhas, mantas e outros itens usados por animais é proibida, para proteger a saúde de todos os clientes. Encontrou pelos na máquina? Avise no atendimento e use outra máquina livre.",
      tags: ["pets", "regras", "higiene"],
    },
    {
      category: "Regras da loja",
      question: "Qual o horário de funcionamento?",
      answer: `A ${store.name} abre todos os dias das ${open} às ${close}. A porta tranca sozinha: retire suas roupas antes das ${close}, senão elas ficam presas até a abertura.`,
      tags: ["horario", "porta"],
    },
    {
      category: "Problemas comuns",
      question: "A porta dá erro e não trava.",
      answer:
        "Abra a porta, confira se nenhuma peça ficou presa na borracha, feche com firmeza até ouvir o clique e aperte INICIAR. Se continuar, abra o atendimento.",
      tags: ["porta", "erro"],
    },
  ].map((a, i) => ({ ...a, sort: i + 1 }));
}
