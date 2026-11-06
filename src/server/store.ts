import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, hasServerSupabase } from "@/lib/env";
import type { StoreHours } from "@/domain/store-hours";
import type { StoreRow } from "@/server/types";

/** Configuração da loja (deduplicada por requisição). */
export const getStore = cache(async (slug: string = env.storeSlug): Promise<StoreRow> => {
  // Sem Supabase (ex.: build de CI): loja padrão; os layouts mostram o aviso de configuração.
  if (!hasServerSupabase()) return FALLBACK_STORE;
  const { data, error } = await createAdminClient().from("stores").select("*").eq("slug", slug).single();
  if (error || !data) throw new Error(`Loja "${slug}" não encontrada. Rode as migrations e o seed.`);
  return data as StoreRow;
});

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
};

export function storeHours(store: StoreRow): StoreHours {
  return {
    openTime: store.open_time.slice(0, 5),
    closeTime: store.close_time.slice(0, 5),
    timeZone: store.timezone,
    closingWarningMinutes: 60,
  };
}
