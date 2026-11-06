"use client";
import { useTransition } from "react";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { openStorePanel } from "@/app/admin/actions";

/** Abre o painel do lojista desta loja (o admin passa a "operar" nela). */
export function OpenPanelButton({ storeId }: { storeId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => openStorePanel(storeId))}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted/60 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <LayoutDashboard className="size-3.5" aria-hidden />}
      Painel
    </button>
  );
}
