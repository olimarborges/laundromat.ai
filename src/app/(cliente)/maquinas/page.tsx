import { Suspense } from "react";
import Link from "next/link";
import { EyeOff, LayoutGrid, Lock } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveMachines } from "@/components/cliente/live-machines";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth";
import { getStore } from "@/server/store";
import type { MachineRow } from "@/server/types";

export const metadata = { title: "Máquinas livres" };

export default function MaquinasPage() {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LayoutGrid className="size-6 text-primary" aria-hidden /> Máquinas livres
        </h1>
        <p className="text-sm text-muted-foreground">Veja antes de sair de casa. Atualiza sozinho.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
        <Machines />
      </Suspense>
      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        Mostramos só o estado das máquinas, nunca imagens ou quantas pessoas estão na loja. Cada consulta fica registrada.
      </p>
    </div>
  );
}

async function Machines() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <GlassCard tone="strong" padding="lg" className="space-y-3 text-center">
        <Lock className="mx-auto size-8 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Disponível para quem tem conta</h2>
        <p className="text-sm text-muted-foreground">
          Por segurança da loja, a consulta das máquinas é só para clientes cadastrados. Crie sua conta em segundos com
          Google ou e-mail e ganhe pontos a cada uso.
        </p>
        <Link
          href="/entrar?next=/maquinas"
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 font-semibold text-primary-foreground"
        >
          Entrar ou criar conta
        </Link>
      </GlassCard>
    );
  }
  const store = await getStore();
  const supabase = await createClient();
  const [{ data }] = await Promise.all([
    supabase.from("machines").select("*").eq("store_id", store.id).order("sort"),
    supabase.from("machine_status_views").insert({ profile_id: user.id, store_id: store.id }),
  ]);
  return <LiveMachines initial={(data ?? []) as MachineRow[]} storeId={store.id} />;
}
