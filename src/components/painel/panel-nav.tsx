"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  BookOpenText,
  FlaskConical,
  Gift,
  Inbox,
  ListChecks,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Store,
  WashingMachine,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const PANEL_ITEMS = [
  { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
  { href: "/painel/casos", label: "Casos", icon: Inbox },
  { href: "/painel/compensacoes", label: "Compensações", icon: Gift },
  { href: "/painel/maquinas", label: "Máquinas", icon: WashingMachine },
  { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/painel/problemas", label: "Problemas", icon: ListChecks },
  { href: "/painel/base-conhecimento", label: "Respostas", icon: BookOpenText },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
  { href: "/painel/simulador", label: "Simulador", icon: FlaskConical },
];

const MOBILE = ["/painel", "/painel/casos", "/painel/maquinas", "/painel/simulador"];

/** Atalhos extras: o admin sempre consegue voltar para a administração (inclusive no app instalado). */
function extraItems(isAdmin?: boolean, storeSlug?: string) {
  return [
    ...(storeSlug ? [{ href: `/${storeSlug}`, label: "Ver como cliente", icon: Store }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Administração", icon: ShieldCheck }] : []),
  ];
}

type NavProps = { badges?: Record<string, number>; isAdmin?: boolean; storeSlug?: string };

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/painel" ? pathname === "/painel" : pathname.startsWith(href));
}

export function PanelSidebar({ badges, isAdmin, storeSlug }: NavProps) {
  const isActive = useActive();
  return <SidebarLinks isActive={isActive} badges={badges} isAdmin={isAdmin} storeSlug={storeSlug} />;
}

/** Versão sem hooks de URL, para fallback de Suspense (não bloqueia o prerender). */
export function PanelSidebarStatic() {
  return <SidebarLinks isActive={() => false} />;
}

function SidebarLinks({ isActive, badges, isAdmin, storeSlug }: NavProps & { isActive: (href: string) => boolean }) {
  const extras = extraItems(isAdmin, storeSlug);
  return (
    <nav aria-label="Painel" className="flex flex-col gap-1">
      {PANEL_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="panel-active"
                className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="relative size-[18px]" aria-hidden />
            <span className="relative flex-1">{label}</span>
            {badges?.[href] ? (
              <span className="relative rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary-foreground tabular-nums">
                {badges[href]}
              </span>
            ) : null}
          </Link>
        );
      })}
      {extras.length ? <div className="my-2 border-t border-border/60" /> : null}
      {extras.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
            href === "/admin"
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
          <span className="flex-1">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function PanelBottomNav({ badges, isAdmin, storeSlug }: NavProps) {
  const isActive = useActive();
  return <BottomLinks isActive={isActive} badges={badges} isAdmin={isAdmin} storeSlug={storeSlug} />;
}

export function PanelBottomNavStatic() {
  return <BottomLinks isActive={() => false} />;
}

function BottomLinks({ isActive, badges, isAdmin, storeSlug }: NavProps & { isActive: (href: string) => boolean }) {
  const items = PANEL_ITEMS.filter((i) => MOBILE.includes(i.href));
  return (
    <nav aria-label="Painel" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
      <ul className="glass-strong mx-auto flex max-w-md items-stretch rounded-[1.6rem] p-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.3rem] text-[0.65rem] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active ? <motion.span layoutId="panel-mobile" className="absolute inset-0 rounded-[1.3rem] bg-primary/10" /> : null}
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {badges?.[href] ? (
                    <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] leading-4 font-semibold text-white">
                      {badges[href]}
                    </span>
                  ) : null}
                </span>
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Sheet>
            <SheetTrigger className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium text-muted-foreground">
              <Menu className="size-5" aria-hidden />
              Mais
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-strong rounded-t-3xl border-0 pb-8">
              <SheetHeader>
                <SheetTitle>Painel</SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <PanelSidebar badges={badges} isAdmin={isAdmin} storeSlug={storeSlug} />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
