/**
 * Junta os resultados do reconhecimento de voz (Web Speech API) sem repetir palavras.
 *
 * Os navegadores entregam a lista de resultados de formas diferentes:
 * - Computador (Chrome/Edge): cada resultado é um TRECHO novo  → ["me ajude", " a máquina não liberou"]
 * - Chrome no Android: cada resultado é CUMULATIVO (repete tudo até ali)
 *   → ["me", "me ajude", "me ajude", "me ajude a máquina"]
 * Concatenar tudo funciona no primeiro caso e repete palavras no segundo.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[.,!?;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function mergeTranscripts(parts: string[]): string {
  const segments: string[] = [];
  for (const raw of parts) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const n = norm(t);
    if (segments.length === 0) {
      segments.push(t);
      continue;
    }
    const whole = norm(segments.join(" "));
    const last = norm(segments[segments.length - 1]);
    if (n.startsWith(whole)) {
      // Cumulativo da sessão inteira (Android): substitui tudo.
      segments.splice(0, segments.length, t);
    } else if (n.startsWith(last)) {
      // O trecho atual cresceu: substitui só o último.
      segments[segments.length - 1] = t;
    } else if (last === n || last.startsWith(n) || whole.endsWith(n)) {
      // Repetição ou versão mais curta de algo que já temos.
      continue;
    } else {
      segments.push(t);
    }
  }
  return segments.join(" ");
}
