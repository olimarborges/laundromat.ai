import "server-only";
import { hasServerSupabase } from "@/lib/env";
import { listKb } from "@/server/support";

/** Base de conhecimento para a página pública (sem Supabase configurado, lista vazia). */
export async function listKbCached(storeId: string) {
  if (!hasServerSupabase()) return [];
  return listKb(storeId);
}
