"use client";
import { useTransition } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { setActiveStore } from "@/app/painel/problem-actions";
import { cn } from "@/lib/utils";

/** Troca a lavanderia aberta no painel (dono com mais de uma loja). */
export function StoreSwitcher({
  stores,
  activeId,
  className,
}: {
  stores: { id: string; name: string }[];
  activeId: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  if (stores.length < 2) return null;
  return (
    <label className={cn("relative flex items-center", className)}>
      <span className="sr-only">Trocar de lavanderia</span>
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(() => setActiveStore(id));
        }}
        className="h-10 w-full appearance-none rounded-xl border bg-background/70 pr-9 pl-3 text-sm font-medium disabled:opacity-60"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="pointer-events-none absolute right-3 size-4 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <ChevronsUpDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden />
      )}
    </label>
  );
}
