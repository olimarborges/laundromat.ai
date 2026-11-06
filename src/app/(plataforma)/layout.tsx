import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/cliente/bottom-nav";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

/** Casca da plataforma: escolher lavanderia, conta e login (valem para todas as lojas). */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  const configured = isSupabaseConfigured();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col lg:max-w-5xl">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Pular para o conteúdo
      </a>
      <header className="pt-safe sticky top-0 z-30 px-4">
        <div className="glass mt-2 flex items-center justify-between gap-2 rounded-2xl py-1.5 pr-1.5 pl-3">
          <Brand subtitle="Atendimento de lavanderias" />
          <ThemeToggle />
        </div>
      </header>
      <main id="conteudo" className="flex flex-1 flex-col px-4 pt-4 pb-32">
        {configured ? children : <SetupNotice />}
      </main>
      <BottomNav />
    </div>
  );
}
