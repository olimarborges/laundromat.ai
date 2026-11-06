"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

/** Mapa para marcar a posição da lavanderia (clique ou arraste o pino). */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const start = value ?? { lat: -29.92, lng: -51.18 };
    const map = new maplibregl.Map({
      container: container.current,
      style: document.documentElement.classList.contains("dark") ? STYLE_DARK : STYLE_LIGHT,
      center: [start.lng, start.lat],
      zoom: value ? 15 : 9,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapa criado uma vez
  }, []);

  useEffect(() => {
    if (mapRef.current && resolvedTheme) mapRef.current.setStyle(resolvedTheme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [resolvedTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#2563eb", draggable: true }).setLngLat([value.lng, value.lat]).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLngLat();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      markerRef.current.setLngLat([value.lng, value.lat]);
    }
    if (!map.getBounds().contains([value.lng, value.lat])) map.flyTo({ center: [value.lng, value.lat], zoom: 15 });
  }, [value]);

  return <div ref={container} className="size-full" role="region" aria-label="Mapa para marcar a localização" />;
}
