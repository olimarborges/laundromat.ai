import "server-only";
import { hasServerSupabase } from "@/lib/env";
import { cacheLife, cacheTag } from "next/cache";
import { listKb } from "@/server/support";

/** Base de conhecimento cacheada para a página pública (painel invalida com updateTag("kb")). */
export async function listKbCached(storeId: string) {
  "use cache";
  cacheTag("kb");
  cacheLife("hours");
  if (!hasServerSupabase()) return [];
  return listKb(storeId);
}
