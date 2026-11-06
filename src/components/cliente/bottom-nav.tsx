"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { House, LifeBuoy, BookOpen, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Início", icon: House },
  { href: "/ajuda", label: "Ajuda", icon: LifeBuoy },
  { href: "/duvidas", label: "Dúvidas", icon: BookOpen },
  { href: "/conta", label: "Conta", icon: CircleUserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/atendimento")) return null;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
