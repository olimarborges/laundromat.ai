"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/**
 * Mantém o painel ao vivo: mudanças em casos, compensações, máquinas e avisos
 * disparam um refresh (com debounce). Avisos urgentes viram toast + notificação do navegador.
 */
export function PanelRealtime({ storeId }: { storeId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const filter = `store_id=eq.${storeId}`;
    const channel = supabase
      .channel(`panel:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cases", filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "compensations", filter }, (p: Payload) => {
        refresh();
        if (p.eventType === "INSERT" && (p.new as { status?: string }).status === "pending") {
          toast.info("Nova compensação aguardando sua aprovação.");
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "machines", filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_terminals", filter }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stores", filter: `id=eq.${storeId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "owner_notifications", filter }, (p: Payload) => {
        refresh();
        const n = p.new as unknown as { priority: string; title: string; body: string };
        if (n.priority === "critical") {
          toast.error(n.title, { description: n.body, duration: 10_000 });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.body, icon: "/icons/icon-192.png" });
          }
          if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
        }
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router, storeId]);

  return null;
}
