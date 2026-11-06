"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/server/auth";
import { isValidSlug, slugify } from "@/domain/stores";
import { kbTemplate } from "@/domain/kb-template";

/** Ações do admin da plataforma: lavanderias e acesso dos donos. Sempre revalida o papel. */

type Result = { ok: boolean; message: string; id?: string };

const time = z.string().regex(/^\d{2}:\d{2}$/, "Horário no formato HH:MM.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const storeSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(80),
  slug: z.string().trim().toLowerCase().optional(),
  description: optionalText(160),
  address: optionalText(160),
  city: optionalText(80),
  state: optionalText(2).transform((v) => (v ? v.toUpperCase() : null)),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  open_time: time,
  close_time: time,
  owner_email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail do dono inválido."),
  owner_password: z.string().optional(),
  washers: z.coerce.number().int().min(0).max(30).optional(),
  dryers: z.coerce.number().int().min(0).max(30).optional(),
  washer_price: z.coerce.number().min(0).max(500).optional(),
  dryer_price: z.coerce.number().min(0).max(500).optional(),
  active: z.boolean().optional(),
});

export type StoreInput = z.input<typeof storeSchema>;

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Confira os campos.";
}

/** Dá acesso ao dono: promove quem já tem conta ou cria com senha provisória. */
async function grantOwner(storeId: string, email: string, password?: string): Promise<string> {
  const db = createAdminClient();
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  const link = (profileId: string) =>
    db.from("store_members").upsert({ store_id: storeId, profile_id: profileId }, { onConflict: "store_id,profile_id" });
  if (existing) {
    const { data: prof } = await db.from("profiles").select("role, store_id").eq("id", existing.id).maybeSingle();
    // Mantém admin como admin e a loja ativa de quem já é dono de outra lavanderia.
    await db
      .from("profiles")
      .upsert(
        { id: existing.id, role: prof?.role === "admin" ? "admin" : "owner", store_id: prof?.store_id ?? storeId },
        { onConflict: "id" },
      );
    await link(existing.id);
    return `${email} já tinha conta e agora também é dono desta lavanderia.`;
  }
  if (password && password.length >= 8) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) return `Não consegui criar o acesso: ${created.error.message}`;
    // O trigger já criou o perfil como dono (owner_email); garante mesmo assim.
    await db.from("profiles").upsert({ id: created.data.user.id, store_id: storeId, role: "owner" }, { onConflict: "id" });
    await link(created.data.user.id);
    return `Acesso criado para ${email} com a senha provisória informada.`;
  }
  return `Quando ${email} entrar em /painel/entrar (link por e-mail), vira dono automaticamente.`;
}

export async function createStore(input: StoreInput): Promise<Result> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const d = parsed.data;
  const slug = d.slug ? slugify(d.slug) : slugify(d.name);
  if (!isValidSlug(slug)) return { ok: false, message: `Endereço "/${slug}" inválido ou reservado. Escolha outro.` };

  const db = createAdminClient();
  const { data: store, error } = await db
    .from("stores")
    .insert({
      slug,
      name: d.name,
      description: d.description,
      address: d.address,
      city: d.city,
      state: d.state,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      open_time: d.open_time,
      close_time: d.close_time,
      owner_email: d.owner_email,
      active: d.active ?? true,
    })
    .select("*")
    .single();
  if (error || !store) {
    return {
      ok: false,
      message: error?.code === "23505" ? `Já existe uma lavanderia em "/${slug}".` : (error?.message ?? "Erro ao criar."),
    };
  }

  const washers = d.washers ?? 2;
  const dryers = d.dryers ?? 2;
  const machines = [
    ...Array.from({ length: washers }, (_, i) => ({
      store_id: store.id,
      code: `L${i + 1}`,
      kind: "washer",
      label: `Lavadora ${i + 1}`,
      price_cents: Math.round((d.washer_price ?? 18) * 100),
      cycle_minutes: 35,
      sort: i + 1,
    })),
    ...Array.from({ length: dryers }, (_, i) => ({
      store_id: store.id,
      code: `S${i + 1}`,
      kind: "dryer",
      label: `Secadora ${i + 1}`,
      price_cents: Math.round((d.dryer_price ?? 16) * 100),
      cycle_minutes: 45,
      sort: washers + i + 1,
    })),
  ];
  await Promise.all([
    machines.length ? db.from("machines").insert(machines) : Promise.resolve(),
    db.from("payment_terminals").insert({ store_id: store.id, provider: "Stone", model: "A definir" }),
    db.from("kb_articles").insert(kbTemplate(store).map((a) => ({ ...a, store_id: store.id, needs_review: true }))),
    // Começa com os problemas da plataforma marcados; o dono ajusta em Painel → Problemas.
    db
      .from("problems")
      .select("id")
      .eq("builtin", true)
      .then(({ data }) =>
        data?.length ? db.from("store_problems").insert(data.map((p) => ({ store_id: store.id, problem_id: p.id }))) : null,
      ),
  ]);

  let ownerMsg = "";
  if (d.owner_email) ownerMsg = " " + (await grantOwner(store.id, d.owner_email, d.owner_password));
  revalidatePath("/", "layout");
  return { ok: true, id: store.id, message: `Lavanderia criada em /${slug}.${ownerMsg}` };
}

export async function updateStore(id: string, input: StoreInput): Promise<Result> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const d = parsed.data;
  const db = createAdminClient();
  const { data: before } = await db.from("stores").select("owner_email").eq("id", id).maybeSingle();
  const patch: Record<string, unknown> = {
    name: d.name,
    description: d.description,
    address: d.address,
    city: d.city,
    state: d.state,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    open_time: d.open_time,
    close_time: d.close_time,
    owner_email: d.owner_email,
  };
  if (typeof d.active === "boolean") patch.active = d.active;
  if (d.slug) {
    const slug = slugify(d.slug);
    if (!isValidSlug(slug)) return { ok: false, message: `Endereço "/${slug}" inválido ou reservado.` };
    patch.slug = slug;
  }
  const { error } = await db.from("stores").update(patch).eq("id", id);
  if (error) {
    return { ok: false, message: error.code === "23505" ? "Esse endereço já é de outra lavanderia." : error.message };
  }
  let ownerMsg = "";
  const emailChanged = d.owner_email && d.owner_email !== (before?.owner_email ?? "").toLowerCase();
  if (d.owner_email && (emailChanged || d.owner_password)) {
    ownerMsg = " " + (await grantOwner(id, d.owner_email, d.owner_password));
  }
  revalidatePath("/", "layout");
  return { ok: true, id, message: `Lavanderia atualizada.${ownerMsg}` };
}

/** O admin "entra" no painel de uma loja (o painel usa a loja do perfil). */
export async function openStorePanel(storeId: string) {
  const user = await requireAdmin();
  await createAdminClient().from("profiles").update({ store_id: storeId }).eq("id", user.id);
  redirect("/painel");
}

// ───────────────────────────── Donos vinculados e sugestões ─────────────────────────────

/** Adiciona mais um dono a uma lavanderia (ex.: sócios), por e-mail. */
export async function addStoreOwner(storeId: string, email: string, password?: string): Promise<Result> {
  await requireAdmin();
  const e = email.trim().toLowerCase();
  if (!z.email().safeParse(e).success) return { ok: false, message: "E-mail inválido." };
  const msg = await grantOwner(storeId, e, password);
  revalidatePath(`/admin/lojas/${storeId}`);
  return { ok: !msg.startsWith("Não consegui"), message: msg };
}

export async function removeStoreOwner(storeId: string, profileId: string): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("store_members").delete().eq("store_id", storeId).eq("profile_id", profileId);
  revalidatePath(`/admin/lojas/${storeId}`);
  return { ok: true, message: "Dono desvinculado desta lavanderia." };
}

const reviewSchema = z.object({
  title: z.string().trim().min(4).max(80),
  chip: z.string().trim().min(4).max(60),
  solution: z.string().trim().min(10).max(2000),
});

/** Aprova uma sugestão (com ajustes de texto) → aparece para todas as lavanderias. */
export async function approveSuggestion(problemId: string, input: z.input<typeof reviewSchema>): Promise<Result> {
  await requireAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira título, frase do cliente e solução." };
  const { error } = await createAdminClient()
    .from("problems")
    .update({ ...parsed.data, visibility: "public", approved_at: new Date().toISOString() })
    .eq("id", problemId)
    .eq("visibility", "pending");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/sugestoes");
  return { ok: true, message: "Sugestão aprovada: agora aparece para todas as lavanderias." };
}

export async function rejectSuggestion(problemId: string): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("problems").update({ visibility: "private" }).eq("id", problemId).eq("visibility", "pending");
  revalidatePath("/admin/sugestoes");
  return { ok: true, message: "Sugestão recusada: continua só na lavanderia de quem criou." };
}
