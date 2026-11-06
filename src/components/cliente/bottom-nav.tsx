"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { House, LifeBuoy, BookOpen, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Barra inferior. Com `slug`: navegação da lavanderia; sem: da plataforma. */
export function BottomNav({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const home = slug ? `/${slug}` : "/";
  const ITEMS = slug
    ? [
        { href: home, label: "Início", icon: House },
        { href: `${home}/ajuda`, label: "Ajuda", icon: LifeBuoy },
        { href: `${home}/duvidas`, label: "Dúvidas", icon: BookOpen },
        { href: "/conta", label: "Conta", icon: CircleUserRound },
      ]
    : [
        { href: "/", label: "Lavanderias", icon: House },
        { href: "/conta", label: "Conta", icon: CircleUserRound },
      ];
  const active = (href: string) => (href === home ? pathname === home : pathname.startsWith(href));

  return (
    <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4">
      <ul className="glass-strong mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] p-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = active(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.4rem] text-[0.7rem] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[1.4rem] bg-primary/10 ring-1 ring-primary/15"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
