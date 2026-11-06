import { connection } from "next/server";
import { getStoreStatus } from "@/domain/store-hours";
import { storeHours } from "@/server/store";
import type { StoreRow } from "@/server/types";
import { cn } from "@/lib/utils";

export async function StoreStatusPill({ store }: { store: StoreRow }) {
  await connection();
  const status = getStoreStatus(new Date(), storeHours(store));
  const tone =
    status.state === "open"
      ? "bg-success/12 text-success"
      : status.state === "closing_soon"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/12 text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", tone)}>
      <span className="relative flex size-2">
        {status.isOpen ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" /> : null}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {status.label}
      <span className="sr-only">. {status.detail}</span>
    </span>
  );
}
