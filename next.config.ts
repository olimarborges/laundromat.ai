import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / Partial Prefetching desligados: ainda travam no Cloudflare Workers
  // (opennextjs-cloudflare#1450). Religar quando o OpenNext suportar.
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Endereços antigos (antes de multi-lavanderia) → loja padrão.
  async redirects() {
    const loja = process.env.NEXT_PUBLIC_STORE_SLUG ?? "easywash";
    return [
      { source: "/m/:codigo", destination: `/${loja}/m/:codigo`, permanent: false },
      { source: "/ajuda", destination: `/${loja}/ajuda`, permanent: false },
      { source: "/duvidas", destination: `/${loja}/duvidas`, permanent: false },
      { source: "/maquinas", destination: `/${loja}/maquinas`, permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
