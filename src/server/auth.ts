import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { ProfileRow } from "@/server/types";

export interface SessionUser {
  id: string;
  email: string | null;
  profile: ProfileRow | null;
}

export interface ManagedStore {
  id: string;
  name: string;
  slug: string;
  city: string | null;
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

/**
 * Lavanderias que a pessoa gerencia: dono → as vinculadas a ele (store_members);
 * admin → todas. Deduplicado por requisição.
 */
export const getManagedStores = cache(async (userId: string, role: string): Promise<ManagedStore[]> => {
  const db = createAdminClient();
  if (role === "admin") {
    const { data } = await db.from("stores").select("id, name, slug, city").order("name");
    return (data ?? []) as ManagedStore[];
  }
  const { data } = await db
    .from("store_members")
    .select("stores(id, name, slug, city)")
    .eq("profile_id", userId);
  return (data ?? [])
    .map((r) => r.stores as unknown as ManagedStore | null)
    .filter((s): s is ManagedStore => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});

/**
 * Exige dono (ou admin) com uma loja ativa válida. profiles.store_id é a loja aberta no
 * painel; se ela não for mais do dono, troca para a primeira loja dele.
 */
export const requireOwner = cache(async (): Promise<SessionUser & { profile: ProfileRow }> => {
  const user = await getSessionUser();
  if (!user) redirect("/painel/entrar");
  const role = user.profile?.role;
  if (role === "admin" && !user.profile?.store_id) redirect("/admin");
  if (role !== "owner" && role !== "admin") redirect("/painel/entrar?erro=sem-permissao");

  if (role === "owner") {
    const stores = await getManagedStores(user.id, role);
    if (stores.length === 0) redirect("/painel/entrar?erro=sem-permissao");
    if (!stores.some((s) => s.id === user.profile!.store_id)) {
      const first = stores[0].id;
      await createAdminClient().from("profiles").update({ store_id: first }).eq("id", user.id);
      user.profile = { ...user.profile!, store_id: first };
    }
  }
  return user as SessionUser & { profile: ProfileRow };
});

/** Exige o admin da plataforma. */
export async function requireAdmin(): Promise<SessionUser & { profile: ProfileRow }> {
  const user = await getSessionUser();
  if (!user) redirect("/painel/entrar?next=/admin");
  if (user.profile?.role !== "admin") redirect("/painel/entrar?erro=sem-permissao");
  return user as SessionUser & { profile: ProfileRow };
}
