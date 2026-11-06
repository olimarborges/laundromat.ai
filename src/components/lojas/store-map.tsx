"use client";
import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import type { PublicStore } from "@/server/types";

/** Estilos vetoriais gratuitos do OpenFreeMap (dados OpenStreetMap), sem chave. */
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const BRAZIL_CENTER: [number, number] = [-51.2, -29.9];

type Located = PublicStore & { lat: number; lng: number };

function pinElement(store: PublicStore, selected: boolean) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `Lavanderia ${store.name}`);
  el.className = "store-pin" + (selected ? " is-selected" : "");
  const initials = store.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  el.innerHTML = `<span class="store-pin__bubble">${initials}</span><span class="store-pin__tip"></span>`;
  return el;
}

export default function StoreMap({
  stores,
  selectedSlug,
  userPos,
  onSelect,
}: {
  stores: PublicStore[];
  selectedSlug: string | null;
  userPos: { lat: number; lng: number } | null;
  onSelect: (slug: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const { resolvedTheme } = useTheme();
  const located = useMemo(() => stores.filter((s): s is Located => s.lat !== null && s.lng !== null), [stores]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: document.documentElement.classList.contains("dark") ? STYLE_DARK : STYLE_LIGHT,
      center: located[0] ? [located[0].lng, located[0].lat] : BRAZIL_CENTER,
      zoom: located.length === 1 ? 12 : 9,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    const markerMap = markers.current;
    if (located.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      located.forEach((s) => bounds.extend([s.lng, s.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
    }
    return () => {
      map.remove();
      mapRef.current = null;
      markerMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapa criado uma vez; marcadores atualizam abaixo
  }, []);

  // Tema claro/escuro.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !resolvedTheme) return;
    map.setStyle(resolvedTheme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [resolvedTheme]);

  // Marcadores das lojas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current.clear();
    located.forEach((s) => {
      const el = pinElement(s, s.slug === selectedSlug);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(s.slug);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map);
      markers.current.set(s.slug, marker);
    });
  }, [located, selectedSlug]);

  // Centraliza na loja escolhida.
  useEffect(() => {
    const map = mapRef.current;
    const s = located.find((x) => x.slug === selectedSlug);
    if (map && s) map.flyTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 14), speed: 1.4 });
  }, [selectedSlug, located]);

  // Posição do cliente.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;
    userMarker.current?.remove();
    const el = document.createElement("span");
    el.className = "user-dot";
    el.setAttribute("aria-label", "Você está aqui");
    userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([userPos.lng, userPos.lat]).addTo(map);
    const bounds = new maplibregl.LngLatBounds([userPos.lng, userPos.lat], [userPos.lng, userPos.lat]);
    located.slice(0, 3).forEach((s) => bounds.extend([s.lng, s.lat]));
    map.fitBounds(bounds, { padding: 70, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando a posição muda
  }, [userPos]);

  return <div ref={container} className="size-full" role="region" aria-label="Mapa das lavanderias" />;
}
