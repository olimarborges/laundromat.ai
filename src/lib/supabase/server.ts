import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Cliente Supabase com a sessão do usuário (cookies). Respeita RLS. */
export async function createClient() {
  // O auth-js lê o relógio ao iniciar; com Cache Components + Partial Prefetching (que pré-renderiza
  // com cookies), isso precisa acontecer só no tempo de requisição.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy.ts renova a sessão.
        }
      },
    },
  });
}
