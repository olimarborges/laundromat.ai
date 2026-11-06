import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem tipos gerados até ligar o projeto (supabase gen types)
type AnyClient = SupabaseClient<any, "public", any>;
let admin: AnyClient | undefined;

/**
 * Cliente com service role: ignora RLS. Só no servidor, para fluxos de visitante
 * (sem conta), simulador e rota do atendente — sempre filtrando por store_id.
 */
export function createAdminClient(): AnyClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  admin ??= createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as AnyClient;
  return admin;
}
