import { StartForm } from "@/components/cliente/start-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/server/auth";
import { getMachineOptions } from "@/server/machines-public";
import type { StoreRow } from "@/server/types";

type SP = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function StartFormLoader({
  store,
  searchParams,
  machineCode,
}: {
  store: StoreRow;
  searchParams: SP;
  machineCode?: string;
}) {
  const [sp, user] = await Promise.all([searchParams, getSessionUser()]);
  const machines = await getMachineOptions(store.id);
  return (
    <StartForm
      storeSlug={store.slug}
      machines={machines}
      defaultMachine={machineCode ?? one(sp.maquina)}
      defaultProblem={one(sp.problema)}
      defaultName={user?.profile?.full_name ?? undefined}
      defaultPhone={user?.profile?.phone ?? undefined}
      loggedIn={Boolean(user)}
      voice={one(sp.voz) === "1"}
    />
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  );
}
