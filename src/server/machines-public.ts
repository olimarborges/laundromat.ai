import "server-only";
import { hasServerSupabase } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MachineOption {
  code: string;
  label: string;
  kind: "washer" | "dryer";
}

/** Só código, nome e tipo (sem estado): seguro para visitantes. */
export async function getMachineOptions(storeId: string): Promise<MachineOption[]> {
  if (!hasServerSupabase()) return [];
  const { data } = await createAdminClient()
    .from("machines")
    .select("code, label, kind")
    .eq("store_id", storeId)
    .order("sort");
  return (data ?? []) as MachineOption[];
}
