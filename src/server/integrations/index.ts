import "server-only";
import type { Integrations } from "./types";
import { mockIntegrations } from "./mock";

/** Hoje só existe o modo simulado. INTEGRATIONS_MODE=live entra quando houver acesso ao Cicclo/Stone. */
export function getIntegrations(): Integrations {
  const mode = process.env.INTEGRATIONS_MODE ?? "mock";
  if (mode !== "mock") {
    console.warn(`[integrations] modo "${mode}" ainda não implementado; usando simulação.`);
  }
  return mockIntegrations;
}

export type { Integrations } from "./types";
