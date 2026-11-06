import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/cliente/bottom-nav";
import { StoreStatusPill } from "@/components/cliente/store-status-pill";
import { StoreBadge } from "@/components/cliente/store-badge";
import { RememberStore } from "@/components/cliente/remember-store";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { requireStore } from "@/server/store";

export async function generateMetadata({ params }: LayoutProps<"/[loja]">): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { loja } = await params;
  const store = await requireStore(loja);
  return {
    title: { absolute: `${store.name} · Atendimento`, template: `%s · ${store.name}` },
    description: `Assistente virtual da ${store.name}: resolva problemas pelo celular, sem baixar aplicativo.`,
  };
}

/** Casca da lavanderia escolhida (/[loja]/...). */
export default async function StoreLayout({ children, params }: LayoutProps<"/[loja]">) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="px-4">
        <SetupNotice />
      </main>
    );
  }
  const { loja } = await params;
  const store = await requireStore(loja);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Pular para o conteúdo
      </a>
      <RememberStore slug={store.slug} name={store.name} />
      <header className="pt-safe sticky top-0 z-30 px-4">
        <div className="glass mt-2 flex items-center justify-between gap-2 rounded-2xl py-1.5 pr-1.5 pl-2">
          <StoreBadge slug={store.slug} name={store.name} city={store.city} />
          <div className="flex shrink-0 items-center gap-0.5">
            <StoreStatusPill store={store} />
            <Link
              href="/?trocar=1"
              aria-label="Trocar de lavanderia"
              title="Trocar de lavanderia"
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60"
            >
              <MapPin className="size-5" aria-hidden />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex flex-1 flex-col px-4 pt-4 pb-32">
        {children}
      </main>
      <BottomNav slug={store.slug} />
    </div>
  );
}
