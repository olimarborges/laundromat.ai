#!/usr/bin/env node
/**
 * Cria (ou promove) o usuário dono da loja.
 * Uso: node --env-file=.env.local scripts/create-owner.mjs voce@email.com SenhaForte123
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: node --env-file=.env.local scripts/create-owner.mjs <email> <senha>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}
const slug = process.env.NEXT_PUBLIC_STORE_SLUG ?? "easywash";
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: store, error: storeErr } = await db.from("stores").select("id").eq("slug", slug).single();
if (storeErr || !store) {
  console.error(`Loja "${slug}" não encontrada. Aplique as migrations e o seed primeiro.`);
  process.exit(1);
}

// Marca o e-mail como dono antes de criar (o trigger handle_new_user usa owner_email).
await db.from("stores").update({ owner_email: email }).eq("id", store.id);

let userId;
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error(created.error.message);
    process.exit(1);
  }
  userId = existing.id;
  await db.auth.admin.updateUserById(userId, { password });
} else {
  userId = created.data.user.id;
}

await db.from("profiles").upsert({ id: userId, store_id: store.id, role: "owner" }, { onConflict: "id" });
console.log(`✔ ${email} é dono da loja "${slug}". Entre em /painel/entrar.`);
