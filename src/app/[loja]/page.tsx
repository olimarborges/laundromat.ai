import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, BookOpen, Clock, LayoutGrid, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { ProblemIcon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { PROBLEM_LIST } from "@/domain/problems";
import { getStoreStatus } from "@/domain/store-hours";
import { formatHourShort, parseHHMM } from "@/domain/time";
import { requireStore, storeHours } from "@/server/store";
import type { StoreRow } from "@/server/types";

export default async function StoreHomePage({ params }: PageProps<"/[loja]">) {
  const { loja } = await params;
  const store = await requireStore(loja);
  const base = `/${store.slug}`;
  const chips = PROBLEM_LIST.filter((p) => p.id !== "outro").slice(0, 6);
  return (
    <div className="flex flex-col gap-4">
      <GlassCard tone="strong" padding="lg" className="overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="size-4" aria-hidden /> Seu assistente virtual · sempre à mão
        </div>
        <h1 className="mt-3 text-[1.9rem] leading-[1.1] font-semibold tracking-tight text-balance">
          Boas-vindas à {store.name}!
        </h1>
        <p className="mt-2 text-[0.95rem] text-muted-foreground">
          Como podemos te ajudar hoje? Tire dúvidas, aprenda a usar as máquinas ou resolva qualquer imprevisto na hora, pelo celular. Sem baixar aplicativo.
        </p>
        <div className="mt-5 grid gap-2.5">
          <Link
            href={`${base}/ajuda`}
            className="group flex h-14 items-center justify-between rounded-2xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98]"
          >
            Falar com o assistente
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href={`${base}/ajuda?voz=1`}
            className="glass-subtle flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium transition active:scale-[0.98]"
          >
            <Mic className="size-4" aria-hidden /> Conversar por voz
          </Link>
        </div>
      </GlassCard>

      <Suspense fallback={<Skeleton className="h-[74px] rounded-3xl" />}>
        <HoursCard store={store} />
      </Suspense>

      <section aria-labelledby="comuns" className="space-y-2.5">
        <h2 id="comuns" className="px-1 text-sm font-semibold text-muted-foreground">
          Atalhos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {chips.map((p) => (
            <Link key={p.id} href={`${base}/ajuda?problema=${p.id}`} className="block">
              <GlassCard interactive padding="sm" className="flex h-full min-h-[84px] flex-col justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ProblemIcon name={p.icon} className="size-[18px]" />
                </span>
                <span className="text-[0.85rem] leading-snug font-medium">{p.chip}</span>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link href={`${base}/duvidas`}>
          <GlassCard interactive padding="sm" className="flex items-center gap-3">
            <BookOpen className="size-5 text-aqua" aria-hidden />
            <span className="text-sm font-medium">Como usar</span>
          </GlassCard>
        </Link>
        <Link href={`${base}/maquinas`}>
          <GlassCard interactive padding="sm" className="flex items-center gap-3">
            <LayoutGrid className="size-5 text-aqua" aria-hidden />
            <span className="text-sm font-medium">Máquinas livres</span>
          </GlassCard>
        </Link>
      </div>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Você conversa com um assistente virtual. As câmeras olham só as máquinas, sem identificar pessoas. Quando
        precisar de uma pessoa, eu chamo o responsável pela loja.
      </p>
    </div>
  );
}

async function HoursCard({ store }: { store: StoreRow }) {
  await connection();
  const hours = storeHours(store);
  const status = getStoreStatus(new Date(), hours);
  return (
    <GlassCard padding="sm" className="flex items-center gap-3 px-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Clock className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{status.label}</p>
        <p className="text-xs text-muted-foreground">
          {status.detail} · todos os dias, {formatHourShort(parseHHMM(hours.openTime))} às{" "}
          {formatHourShort(parseHHMM(hours.closeTime))}
        </p>
      </div>
    </GlassCard>
  );
}
