#!/usr/bin/env node
/**
 * Cria (ou promove) um admin da plataforma (cadastra lavanderias e convida donos).
 * Uso: node --env-file=.env.local scripts/create-admin.mjs voce@email.com SenhaForte123
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Uso: node --env-file=.env.local scripts/create-admin.mjs <email> <senha com 8+ caracteres>");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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
const { error } = await db.from("profiles").upsert({ id: userId, role: "admin", store_id: null }, { onConflict: "id" });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`✔ ${email} é admin da plataforma. Entre em /painel/entrar e acesse /admin.`);
