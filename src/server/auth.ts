import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ProfileRow } from "@/server/types";

export interface SessionUser {
  id: string;
  email: string | null;
  profile: ProfileRow | null;
}

/** Usuário da sessão (verificado via getClaims), deduplicado por requisição. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    profile: (profile as ProfileRow | null) ?? null,
  };
});

/** Exige o dono da loja; senão manda para o login do painel. */
export async function requireOwner(): Promise<SessionUser & { profile: ProfileRow }> {
  const user = await getSessionUser();
  if (!user) redirect("/painel/entrar");
  if (user.profile?.role !== "owner" || !user.profile.store_id) redirect("/painel/entrar?erro=sem-permissao");
  return user as SessionUser & { profile: ProfileRow };
}
