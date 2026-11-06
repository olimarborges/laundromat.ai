import { describe, expect, it } from "vitest";
import { mergeTranscripts } from "./speech";

describe("ditado: juntar resultados sem repetir", () => {
  it("computador: trechos novos são concatenados", () => {
    expect(mergeTranscripts(["me ajude", " a máquina não liberou"])).toBe("me ajude a máquina não liberou");
  });

  it("Android: resultados cumulativos não repetem palavras", () => {
    expect(mergeTranscripts(["me", "me ajude", "me ajude", "me ajude"])).toBe("me ajude");
    expect(mergeTranscripts(["paguei", "paguei a lavadora", "paguei a lavadora dois e ela não liberou"])).toBe(
      "paguei a lavadora dois e ela não liberou",
    );
  });

  it("Android: o mesmo trecho final repetido várias vezes", () => {
    expect(mergeTranscripts(["Me ajude", "me ajude", "me ajude.", "Me ajude"])).toBe("Me ajude");
  });

  it("mistura: segunda frase depois de uma pausa", () => {
    expect(mergeTranscripts(["me ajude", "me ajude", "a roupa não secou", "a roupa não secou direito"])).toBe(
      "me ajude a roupa não secou direito",
    );
  });

  it("ignora vazios e espaços", () => {
    expect(mergeTranscripts(["", "  ", "oi"])).toBe("oi");
  });
});
