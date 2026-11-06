"use client";
import { useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { MachineRow } from "@/server/types";

/** Máquinas em tempo real (Supabase Realtime; respeita RLS do usuário logado). */
export function useLiveMachines(initial: MachineRow[], storeId: string) {
  const [machines, setMachines] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`machines:${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "machines", filter: `store_id=eq.${storeId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.new as unknown as MachineRow;
          if (!row?.id) return;
          setMachines((list) => {
            const exists = list.some((m) => m.id === row.id);
            const next = exists ? list.map((m) => (m.id === row.id ? row : m)) : [...list, row];
            return next.sort((a, b) => a.sort - b.sort);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return machines;
}
