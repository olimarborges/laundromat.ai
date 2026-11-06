import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupNotice } from "@/components/setup-notice";
import { PanelBottomNav, PanelSidebar } from "@/components/painel/panel-nav";
import { PanelRealtime } from "@/components/painel/panel-realtime";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isSupabaseConfigured } from "@/lib/env";
import { requireOwner } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: { default: "Painel", template: "%s · Painel EasyWash" } };

export default function PanelLayout({ children }: LayoutProps<"/painel">) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="px-4">
        <SetupNotice />
      </main>
    );
  }
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl gap-6 px-3 lg:px-6">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 py-6 lg:flex">
        <Brand href="/painel" subtitle="Painel do lojista" />
        <Suspense fallback={<PanelSidebar />}>
          <SidebarWithBadges />
        </Suspense>
        <div className="mt-auto space-y-2">
          <ThemeToggle />
          <SignOutButton redirectTo="/painel/entrar" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pt-safe sticky top-0 z-30 lg:hidden">
          <div className="glass mt-2 flex items-center justify-between rounded-2xl py-1.5 pr-1.5 pl-3">
            <Brand href="/painel" subtitle="Painel do lojista" />
            <ThemeToggle />
          </div>
        </header>
        <main id="conteudo" className="flex-1 pt-4 pb-32 lg:pt-6 lg:pb-10">
          {children}
        </main>
      </div>
      <Suspense fallback={<PanelBottomNav />}>
        <BottomWithBadges />
      </Suspense>
    </div>
  );
}

async function getBadges() {
  const user = await requireOwner();
  const storeId = user.profile.store_id as string;
  const db = createAdminClient();
  const [cases, comps] = await Promise.all([
    db.from("cases").select("id", { count: "exact", head: true }).eq("store_id", storeId).in("status", ["open", "waiting_owner"]),
    db.from("compensations").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
  ]);
  return {
    storeId,
    badges: { "/painel/casos": cases.count ?? 0, "/painel/compensacoes": comps.count ?? 0 },
  };
}

async function SidebarWithBadges() {
  const { badges, storeId } = await getBadges();
  return (
    <>
      <PanelSidebar badges={badges} />
      <PanelRealtime storeId={storeId} />
    </>
  );
}

async function BottomWithBadges() {
  const { badges } = await getBadges();
  return <PanelBottomNav badges={badges} />;
}
