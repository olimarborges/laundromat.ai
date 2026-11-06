import "server-only";

/**
 * Hora da requisição para Server Components. Chame só depois de `await connection()`
 * (com Cache Components, ler o relógio no prerender quebra o build).
 */
export function requestNow(): number {
  return Date.now();
}
