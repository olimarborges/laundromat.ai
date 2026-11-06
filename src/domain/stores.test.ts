import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, isValidSlug, slugify } from "./stores";

describe("endereço das lavanderias (slug)", () => {
  it("gera slug sem acento e com hífen", () => {
    expect(slugify("Lavanderia São João!")).toBe("lavanderia-sao-joao");
    expect(slugify("  EasyWash  NH ")).toBe("easywash-nh");
  });
  it("bloqueia caminhos reservados do app", () => {
    expect(isValidSlug("painel")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("easywash")).toBe(true);
  });
});

describe("distância", () => {
  it("Novo Hamburgo → Porto Alegre ≈ 35 km", () => {
    const km = distanceKm({ lat: -29.6788, lng: -51.1306 }, { lat: -30.0346, lng: -51.2177 });
    expect(km).toBeGreaterThan(35);
    expect(km).toBeLessThan(45);
    expect(formatDistance(0.42)).toBe("420 m");
    expect(formatDistance(3.25)).toBe("3,3 km");
  });
});
