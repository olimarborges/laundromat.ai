import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, hasServerSupabase } from "@/lib/env";
import type { StoreHours } from "@/domain/store-hours";
import type { PublicStore, StoreRow } from "@/server/types";

/** Lojas (multi-lavanderia). Leituras deduplicadas por requisição. */

const FALLBACK_STORE: StoreRow = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "easywash",
  name: "EasyWash",
  address: null,
  timezone: "America/Sao_Paulo",
  open_time: "06:00:00",
  close_time: "23:00:00",
  owner_whatsapp: null,
  owner_email: null,
  pilot_phase: 1,
  notify_hours: [8, 11, 13, 18, 20],
  policy: { maxPerCaseCents: 2000, maxPerCustomerPerDayCents: 2000, maxPerStorePerDayCents: 6000 },
  internet_status: "online",
  internet_changed_at: "2026-01-01T00:00:00.000Z",
  city: "Novo Hamburgo",
  state: "RS",
  lat: -29.6788,
  lng: -51.1306,
  description: null,
  brand_color: null,
  active: true,
};

const PUBLIC_FIELDS = "id, slug, name, address, city, state, lat, lng, description, open_time, close_time, timezone";

/** Loja pelo slug da URL (/easywash). Lojas inativas não aparecem para o público. */
export const getStoreBySlug = cache(async (slug: string): Promise<StoreRow | null> => {
  if (!hasServerSupabase()) return slug === FALLBACK_STORE.slug ? FALLBACK_STORE : null;
  const { data } = await createAdminClient().from("stores").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  return (data as StoreRow | null) ?? null;
});

/** Loja pública pelo slug ou 404. */
export async function requireStore(slug: string): Promise<StoreRow> {
  const store = await getStoreBySlug(decodeURIComponent(slug));
  if (!store || !store.active) notFound();
  return store;
}

/** Loja pelo id (conversas, painel do dono). */
export const getStoreById = cache(async (id: string): Promise<StoreRow> => {
  if (!hasServerSupabase()) return FALLBACK_STORE;
  const { data, error } = await createAdminClient().from("stores").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Loja não encontrada.");
  return data as StoreRow;
});

/** Loja padrão (rotas antigas sem slug, ex.: /m/L1 → /easywash/m/L1). */
export async function getStore(): Promise<StoreRow> {
  const store = await getStoreBySlug(env.storeSlug);
  if (!store) throw new Error(`Loja "${env.storeSlug}" não encontrada. Rode as migrations e o seed.`);
  return store;
}

/** Lojas ativas para o mapa/busca. */
export const listPublicStores = cache(async (): Promise<PublicStore[]> => {
  if (!hasServerSupabase()) return [FALLBACK_STORE];
  const { data } = await createAdminClient().from("stores").select(PUBLIC_FIELDS).eq("active", true).order("name");
  return (data ?? []) as PublicStore[];
});

export function storeHours(store: Pick<StoreRow, "open_time" | "close_time" | "timezone">): StoreHours {
  return {
    openTime: store.open_time.slice(0, 5),
    closeTime: store.close_time.slice(0, 5),
    timeZone: store.timezone,
    closingWarningMinutes: 60,
  };
}
