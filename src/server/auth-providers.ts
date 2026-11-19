import "server-only";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * O login com Google está ligado no Supabase? (endpoint público /auth/v1/settings).
 * Assim o botão só aparece quando o provedor estiver configurado; erro de rede → esconde.
 */
export async function isGoogleLoginEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { external?: Record<string, boolean> };
    return Boolean(json.external?.google);
  } catch {
    return false;
  }
}
