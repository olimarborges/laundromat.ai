import { Suspense, cache } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupNotice } from "@/components/setup-notice";
import { PanelBottomNav, PanelBottomNavStatic, PanelSidebar, PanelSidebarStatic } from "@/components/painel/panel-nav";
import { PanelRealtime } from "@/components/painel/panel-realtime";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isSupabaseConfigured } from "@/lib/env";
import { getManagedStores, requireOwner } from "@/server/auth";
import { StoreSwitcher } from "@/components/painel/store-switcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreById } from "@/server/store";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

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
        <Brand href="/painel" name="Painel do lojista" subtitle="laundromat.ai" />
        <Suspense fallback={<PanelSidebarStatic />}>
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
            <Brand href="/painel" name="Painel do lojista" subtitle="laundromat.ai" />
            <div className="flex items-center gap-1">
              <Suspense fallback={null}>
                <AdminShortcut />
              </Suspense>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="conteudo" className="flex-1 pt-4 pb-32 lg:pt-6 lg:pb-10">
          {children}
        </main>
      </div>
      <Suspense fallback={<PanelBottomNavStatic />}>
        <BottomWithBadges />
      </Suspense>
    </div>
  );
}

const getBadges = cache(async () => {
  const user = await requireOwner();
  const storeId = user.profile.store_id as string;
  const db = createAdminClient();
  const [cases, comps] = await Promise.all([
    db.from("cases").select("id", { count: "exact", head: true }).eq("store_id", storeId).in("status", ["open", "waiting_owner"]),
    db.from("compensations").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
  ]);
  const [store, managed] = await Promise.all([getStoreById(storeId), getManagedStores(user.id, user.profile.role)]);
  return {
    storeId,
    store,
    managed,
    isAdmin: user.profile.role === "admin",
    badges: { "/painel/casos": cases.count ?? 0, "/painel/compensacoes": comps.count ?? 0 },
  };
});

async function SidebarWithBadges() {
  const { badges, storeId, store, isAdmin, managed } = await getBadges();
  return (
    <>
      <div className="glass space-y-1 rounded-2xl p-3">
        <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">Lavanderia</p>
        {managed.length > 1 ? (
          <StoreSwitcher stores={managed} activeId={store.id} />
        ) : (
          <p className="truncate font-semibold">{store.name}</p>
        )}
        <Link href={`/${store.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Ver como cliente <ExternalLink className="size-3" aria-hidden />
        </Link>
        {isAdmin ? (
          <Link href="/admin" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ShieldCheck className="size-3.5" aria-hidden /> Administração da plataforma
          </Link>
        ) : null}
      </div>
      <PanelSidebar badges={badges} isAdmin={isAdmin} storeSlug={store.slug} />
      <PanelRealtime storeId={storeId} />
    </>
  );
}

async function BottomWithBadges() {
  const { badges, isAdmin, store } = await getBadges();
  return <PanelBottomNav badges={badges} isAdmin={isAdmin} storeSlug={store.slug} />;
}

/** Botão fixo no topo (celular/app instalado) para o admin voltar à administração. */
async function AdminShortcut() {
  const { isAdmin } = await getBadges();
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary"
    >
      <ShieldCheck className="size-4" aria-hidden /> Admin
    </Link>
  );
}
