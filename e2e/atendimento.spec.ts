import { expect, test } from "@playwright/test";

test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Precisa do Supabase configurado (.env.local).");

test("cliente abre atendimento pelo QR Code e recebe resposta", async ({ page }) => {
  await page.goto("/m/L1");
  await expect(page.getByRole("heading", { name: "Lavadora 1" })).toBeVisible();

  await page.getByLabel("Seu nome").fill("Teste E2E");
  await page.getByLabel(/Celular/).fill("51999999999");
  await page.getByRole("radio", { name: "A maquininha travou" }).click();
  await page.getByRole("button", { name: /Começar atendimento/ }).click();

  await expect(page).toHaveURL(/\/atendimento\//);
  // A primeira resposta (IA ou modo roteiro) traz o passo a passo de reinício.
  await expect(page.getByText(/maquininha/i).last()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByLabel("Mensagem")).toBeVisible();
});

test("máquinas livres exigem conta", async ({ page }) => {
  await page.goto("/maquinas");
  await expect(page.getByText("Disponível para quem tem conta")).toBeVisible();
});
