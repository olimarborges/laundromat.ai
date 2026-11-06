"use client";
import { MachineTile, useNow } from "@/components/machine-tile";
import { useLiveMachines } from "@/hooks/use-live-machines";
import { isAvailable } from "@/domain/machines";
import type { MachineRow } from "@/server/types";

export function LiveMachines({ initial, storeId }: { initial: MachineRow[]; storeId: string }) {
  const machines = useLiveMachines(initial, storeId);
  const now = useNow();
  const freeWashers = machines.filter((m) => m.kind === "washer" && isAvailable(m, now)).length;
  const freeDryers = machines.filter((m) => m.kind === "dryer" && isAvailable(m, now)).length;
  return (
    <div className="space-y-3">
      <p className="px-1 text-sm" aria-live="polite">
        <span className="font-semibold">{freeWashers}</span> lavadora{freeWashers === 1 ? "" : "s"} e{" "}
        <span className="font-semibold">{freeDryers}</span> secadora{freeDryers === 1 ? "" : "s"} livre
        {freeWashers + freeDryers === 1 ? "" : "s"} agora.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {machines.map((m) => (
          <MachineTile key={m.id} machine={m} now={now} />
        ))}
      </div>
    </div>
  );
}
