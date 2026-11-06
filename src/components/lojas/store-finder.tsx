"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ChevronRight, LocateFixed, Loader2, MapPin, QrCode, Search, Store } from "lucide-react";
import { LAST_STORE_KEY } from "@/components/cliente/remember-store";
import { Skeleton } from "@/components/ui/skeleton";
import { distanceKm, formatDistance } from "@/domain/stores";
import { getStoreStatus } from "@/domain/store-hours";
import type { PublicStore } from "@/server/types";
import { cn } from "@/lib/utils";

const StoreMap = dynamic(() => import("./store-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

const hours = (s: PublicStore) => ({
  openTime: s.open_time.slice(0, 5),
  closeTime: s.close_time.slice(0, 5),
  timeZone: s.timezone,
});

export function StoreFinder({ stores }: { stores: PublicStore[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "loading" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [last, setLast] = useState<{ slug: string; name: string } | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Só no cliente (evita divergência na hidratação): relógio e última lavanderia.
    const init = setTimeout(() => {
      setNow(new Date());
      try {
        const raw = localStorage.getItem(LAST_STORE_KEY);
        const parsed = raw ? (JSON.parse(raw) as { slug: string; name: string }) : null;
        if (parsed && stores.some((s) => s.slug === parsed.slug)) setLast(parsed);
      } catch {
        // armazenamento indisponível
      }
    }, 0);
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearTimeout(init);
      clearInterval(t);
    };
  }, [stores]);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = q
      ? stores.filter((s) => normalize(`${s.name} ${s.city ?? ""} ${s.address ?? ""}`).includes(q))
      : stores;
    const withDistance = filtered.map((s) => ({
      store: s,
      km: userPos && s.lat !== null && s.lng !== null ? distanceKm(userPos, { lat: s.lat, lng: s.lng }) : null,
    }));
    return withDistance.sort((a, b) =>
      a.km !== null && b.km !== null ? a.km - b.km : a.store.name.localeCompare(b.store.name, "pt-BR"),
    );
  }, [stores, query, userPos]);

  const mapStores = useMemo(() => list.map((x) => x.store), [list]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      setGeoError("Seu navegador não informa a localização. Busque pelo nome ou cidade.");
      return;
    }
    setGeo("loading");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("idle");
      },
      (err) => {
        setGeo("error");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Localização bloqueada. Permita no navegador ou busque pelo nome."
            : "Não consegui pegar sua localização agora. Tente de novo ou busque pelo nome.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr] [&>*]:min-w-0">
      {last ? (
        <Link
          href={`/${last.slug}`}
          className="group flex items-center gap-3 rounded-3xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] lg:col-span-2"
        >
          <Store className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 leading-tight">
            <span className="block text-xs opacity-80">Continuar onde você parou</span>
            <span className="block font-semibold">{last.name}</span>
          </span>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}

      <div className="space-y-2 lg:col-start-2">
        <div className="glass-strong flex items-center gap-2 rounded-2xl p-1.5 pl-3">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="busca-loja" className="sr-only">
            Buscar lavanderia
          </label>
          <input
            id="busca-loja"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome da lavanderia ou cidade"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={locate}
            disabled={geo === "loading"}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-medium text-accent-foreground transition active:scale-95 disabled:opacity-60"
          >
            {geo === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
            <span className="hidden sm:inline">Perto de mim</span>
            <span className="sm:hidden">Perto</span>
          </button>
        </div>
        {geoError ? (
          <p role="alert" className="px-1 text-xs text-destructive">
            {geoError}
          </p>
        ) : null}

      </div>

      <div
        className={cn(
          "glass overflow-hidden rounded-3xl lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:h-[calc(100dvh-8rem)]",
          last ? "lg:row-start-2" : "lg:row-start-1",
        )}
      >
        <div className="h-[42dvh] min-h-64 lg:h-full">
          <StoreMap
            stores={mapStores}
            selectedSlug={selected}
            userPos={userPos}
            onSelect={setSelected}
          />
        </div>
      </div>
      <div className="space-y-3 lg:col-start-2">
        <ul className="space-y-2.5" aria-label="Lavanderias">
          {list.length === 0 ? (
            <li className="glass rounded-3xl p-5 text-center text-sm text-muted-foreground">
              Nenhuma lavanderia encontrada para “{query}”.
            </li>
          ) : (
            list.map(({ store: s, km }, i) => {
              const status = now ? getStoreStatus(now, hours(s)) : null;
              const isSel = selected === s.slug;
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                >
                  <div
                    className={cn(
                      "glass glass-sheen flex items-center gap-3 rounded-3xl p-3 pr-2 transition",
                      isSel && "ring-2 ring-primary/50",
                    )}
                    onMouseEnter={() => setSelected(s.slug)}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(s.slug)}
                      aria-label={`Ver ${s.name} no mapa`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua to-primary text-sm font-bold text-white"
                    >
                      {s.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("")}
                    </button>
                    <Link href={`/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.name}</span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {s.city ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden />
                              {s.city}
                              {s.state ? `/${s.state}` : ""}
                            </span>
                          ) : null}
                          {km !== null ? <span className="font-medium text-foreground">{formatDistance(km)}</span> : null}
                          {status ? (
                            <span
                              className={cn(
                                "font-medium",
                                status.state === "open" && "text-success",
                                status.state === "closing_soon" && "text-warning",
                                status.state === "closed" && "text-destructive",
                              )}
                            >
                              {status.label}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </div>
                </motion.li>
              );
            })
          )}
        </ul>

        <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <QrCode className="size-4 shrink-0" aria-hidden />
          Na lavanderia? Aponte a câmera para o QR Code da máquina: abre direto o atendimento dela.
        </p>
      </div>

    </div>
  );
}
