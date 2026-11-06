"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreBySlug } from "@/server/store";
import { getSessionUser } from "@/server/auth";
import { ensureVisitorToken } from "@/server/visitor";
import { createConversation, getMachineByCode } from "@/server/support";
import { findStoreProblem } from "@/server/problems";

export interface StartState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone", string>>;
}

const nameSchema = z.string().trim().min(2, "Diga como podemos te chamar.").max(60);
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Celular com DDD, ex.: (51) 99999-9999.");

const schema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  machine: z.string().trim().max(4).optional(),
  problem: z.string().optional(),
  voice: z.string().optional(),
  store: z.string().trim().min(1).max(60),
  saveProfile: z.string().optional(),
});

/**
 * Abre o atendimento. Logado: usa nome/telefone do cadastro e só pede o que falta
 * (e guarda no perfil). Visitante: nome e telefone obrigatórios.
 */
export async function startConversation(_prev: StartState, formData: FormData): Promise<StartState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Não consegui abrir o atendimento. Tente de novo." };
  const { machine: code, problem, voice, store: slug, saveProfile } = parsed.data;

  const user = await getSessionUser();
  const profileName = user?.profile?.full_name?.trim() || null;
  const profilePhone = user?.profile?.phone?.replace(/\D/g, "") || null;

  // O que veio do formulário tem prioridade (a pessoa pode ter tocado em "Alterar").
  const typedName = parsed.data.name?.trim() ? parsed.data.name : null;
  const typedPhone = parsed.data.phone?.trim() ? parsed.data.phone : null;

  const nameResult = nameSchema.safeParse(typedName ?? profileName ?? "");
  const phoneResult = phoneSchema.safeParse(typedPhone ?? profilePhone ?? "");
  if (!nameResult.success || !phoneResult.success) {
    return {
      fieldErrors: {
        name: nameResult.success ? undefined : nameResult.error.issues[0]?.message,
        phone: phoneResult.success ? undefined : phoneResult.error.issues[0]?.message,
      },
    };
  }
  const name = nameResult.data;
  const phone = phoneResult.data;

  const store = await getStoreBySlug(slug);
  if (!store || !store.active) return { error: "Lavanderia não encontrada." };

  // Logado e completou/alterou dados: guarda no cadastro (só os próprios campos).
  if (user && saveProfile === "1" && (name !== profileName || phone !== profilePhone)) {
    await createAdminClient().from("profiles").update({ full_name: name, phone }).eq("id", user.id);
  }

  const [machine, visitorToken] = await Promise.all([
    code ? getMachineByCode(store.id, code) : Promise.resolve(null),
    ensureVisitorToken(),
  ]);
  const chosen = await findStoreProblem(store.id, problem);
  const problemType = chosen && chosen.key !== "outro" ? chosen.key : null;

  const conv = await createConversation({
    storeId: store.id,
    visitorToken,
    customerId: user?.id ?? null,
    name,
    phone,
    machineId: machine?.id ?? null,
    problemType,
    mode: process.env.ANTHROPIC_API_KEY ? "ai" : "script",
  });

  const params = new URLSearchParams();
  if (problemType) {
    params.set("primeira", `${chosen!.chip}${machine ? ` (máquina ${machine.code})` : ""}`);
  }
  if (voice === "1") params.set("voz", "1");
  redirect(`/atendimento/${conv.id}${params.size ? `?${params}` : ""}`);
}

export interface ProfileState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"name" | "phone", string>>;
}

/** "Meus dados" na aba Conta. */
export async function updateMyProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { message: "Entre na sua conta para editar seus dados." };
  const n = nameSchema.safeParse(String(formData.get("name") ?? ""));
  const p = phoneSchema.safeParse(String(formData.get("phone") ?? ""));
  if (!n.success || !p.success) {
    return {
      fieldErrors: {
        name: n.success ? undefined : n.error.issues[0]?.message,
        phone: p.success ? undefined : p.error.issues[0]?.message,
      },
    };
  }
  const { error } = await createAdminClient().from("profiles").update({ full_name: n.data, phone: p.data }).eq("id", user.id);
  if (error) return { message: "Não consegui salvar agora. Tente de novo." };
  return { ok: true, message: "Dados salvos." };
}
