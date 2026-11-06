/** Variáveis de ambiente com checagem amigável (o protótipo roda mesmo sem tudo configurado). */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  storeSlug: process.env.NEXT_PUBLIC_STORE_SLUG ?? "easywash",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseKey);
}

/** Servidor com service role disponível (leituras cacheadas e fluxos de visitante). */
export function hasServerSupabase(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
