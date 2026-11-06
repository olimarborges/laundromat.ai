import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca EasyWash: gota/bolha em gradiente. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="ew-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--aqua)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#ew-g)" />
      <circle cx="20" cy="21.5" r="9" fill="none" stroke="white" strokeWidth="2.4" opacity="0.95" />
      <path d="M13.5 22.5c2.2 1.6 4.4 1.6 6.5 0s4.3-1.6 6.5 0" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="29" cy="10.5" r="2.3" fill="white" opacity="0.9" />
      <circle cx="33" cy="15" r="1.3" fill="white" opacity="0.75" />
    </svg>
  );
}

export function Brand({ href = "/", subtitle, name = "laundromat.ai" }: { href?: string; subtitle?: string; name?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight">{name}</span>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
