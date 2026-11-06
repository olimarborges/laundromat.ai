/** Regras de identificação das lojas (slug na URL). */

/** Caminhos do app que não podem virar nome de loja. */
export const RESERVED_SLUGS = new Set([
  "admin", "painel", "api", "auth", "atendimento", "conta", "entrar", "offline", "ajuda", "duvidas",
  "maquinas", "m", "manifest", "icons", "icon", "apple-icon", "sw", "_next", "favicon", "lojas", "sobre",
]);

/** "Lavanderia São João!" → "lavanderia-sao-joao" */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 40 && !RESERVED_SLUGS.has(slug);
}

/** Distância em km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}
