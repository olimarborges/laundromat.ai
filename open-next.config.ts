// Adaptador OpenNext para Cloudflare Workers.
// Cache de assets estáticos (somente leitura): não exige criar R2/KV na conta.
// Para revalidação persistente depois, troque por r2/kv incremental cache.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
});
