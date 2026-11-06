import Link from "next/link";

/** Identidade da lavanderia no cabeçalho: monograma + nome. */
export function StoreBadge({ slug, name, city }: { slug: string; name: string; city?: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <Link href={`/${slug}`} className="flex min-w-0 items-center gap-2.5 rounded-xl">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua to-primary text-sm font-bold text-white shadow-sm shadow-primary/30">
        {initials || "L"}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-base font-semibold tracking-tight">{name}</span>
        {city ? <span className="truncate text-xs text-muted-foreground">{city}</span> : null}
      </span>
    </Link>
  );
}
