import Link from "next/link";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { requireAdmin } from "@/server/auth";

export const metadata = { title: { default: "Administração", template: "%s · Admin laundromat.ai" } };

/** Administração da plataforma (multi-lavanderia). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const user = await requireAdmin();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 pb-16 lg:px-6">
      <header className="pt-safe sticky top-0 z-30">
        <div className="glass mt-2 flex items-center justify-between gap-2 rounded-2xl py-1.5 pr-1.5 pl-3">
          <div className="flex items-center gap-3">
            <Brand href="/admin" name="Administração" subtitle="laundromat.ai" />
            <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline-flex">
              <ShieldCheck className="size-3.5" aria-hidden /> Admin da plataforma
            </span>
          </div>
          <div className="flex items-center gap-1">
            {user.profile.store_id ? (
              <Link
                href="/painel"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-medium text-accent-foreground"
              >
                <LayoutDashboard className="size-4" aria-hidden /> Painel
              </Link>
            ) : null}
            <Link href="/" className="hidden rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 sm:block">
              Ver app
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex-1 pt-6">
        {children}
      </main>
      <div className="mx-auto w-full max-w-xs pt-10">
        <SignOutButton redirectTo="/painel/entrar" />
      </div>
    </div>
  );
}
