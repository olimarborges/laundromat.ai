import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EasyWash · Atendimento",
    short_name: "EasyWash",
    description: "Assistente virtual da lavanderia EasyWash.",
    lang: "pt-BR",
    start_url: "/?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef4fb",
    theme_color: "#2563eb",
    categories: ["lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Preciso de ajuda", url: "/ajuda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Máquinas livres", url: "/maquinas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
