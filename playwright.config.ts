import { defineConfig, devices } from "@playwright/test";

/** E2E no tamanho de celular. Requer .env.local com um projeto Supabase já migrado (pnpm db:push). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
