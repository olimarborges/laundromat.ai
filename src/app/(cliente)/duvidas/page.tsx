import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStore } from "@/server/store";
import { listKbCached } from "@/server/kb";

export const metadata = { title: "Dúvidas" };

export default function DuvidasPage() {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Como usar a lavanderia</h1>
        <p className="text-sm text-muted-foreground">Respostas escritas junto com a loja.</p>
      </div>
      <Suspense fallback={<KbSkeleton />}>
        <KbList />
      </Suspense>
      <GlassCard padding="md" className="flex items-center gap-3">
        <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="flex-1 text-sm">Não achou o que precisava?</p>
        <Link href="/ajuda" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Perguntar
        </Link>
      </GlassCard>
    </div>
  );
}

async function KbList() {
  const store = await getStore();
  const articles = await listKbCached(store.id);
  const groups = Object.entries(
    articles.reduce<Record<string, typeof articles>>((acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    }, {}),
  );
  return (
    <div className="space-y-5">
      {groups.map(([cat, items]) => (
        <section key={cat} aria-labelledby={`cat-${cat}`} className="space-y-2">
          <h2 id={`cat-${cat}`} className="px-1 text-sm font-semibold text-muted-foreground">
            {cat}
          </h2>
          <GlassCard tone="strong" padding="none" className="divide-y divide-border/70 overflow-hidden">
            {items.map((a) => (
              <details key={a.id} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.95rem] font-medium [&::-webkit-details-marker]:hidden">
                  {a.question}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{a.answer}</p>
              </details>
            ))}
          </GlassCard>
        </section>
      ))}
    </div>
  );
}

function KbSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-2xl" />
      ))}
    </div>
  );
}
