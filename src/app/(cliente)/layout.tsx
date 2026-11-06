import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/cliente/bottom-nav";
import { StoreStatusPill, StoreStatusPillSkeleton } from "@/components/cliente/store-status-pill";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export default function ClienteLayout({ children }: LayoutProps<"/">) {
  const configured = isSupabaseConfigured();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Pular para o conteúdo
      </a>
      <header className="pt-safe sticky top-0 z-30 px-4">
        <div className="glass mt-2 flex items-center justify-between gap-2 rounded-2xl py-1.5 pr-1.5 pl-3">
          <Brand />
          <div className="flex items-center gap-1">
            {configured ? (
              <Suspense fallback={<StoreStatusPillSkeleton />}>
                <StoreStatusPill />
              </Suspense>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex flex-1 flex-col px-4 pt-4 pb-32">
        {configured ? children : <SetupNotice />}
      </main>
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
