"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStoreBySlug } from "@/server/store";
import { getSessionUser } from "@/server/auth";
import { ensureVisitorToken } from "@/server/visitor";
import { createConversation, getMachineByCode } from "@/server/support";
import { PROBLEMS, isProblemType } from "@/domain/problems";

export interface StartState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone", string>>;
}

const schema = z.object({
  name: z.string().trim().min(2, "Diga como podemos te chamar.").max(60),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10 || v.length === 11, "Celular com DDD, ex.: (51) 99999-9999."),
  machine: z.string().trim().max(4).optional(),
  problem: z.string().optional(),
  voice: z.string().optional(),
  store: z.string().trim().min(1).max(60),
});

export async function startConversation(_prev: StartState, formData: FormData): Promise<StartState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe = z.flattenError(parsed.error).fieldErrors;
    return { fieldErrors: { name: fe.name?.[0], phone: fe.phone?.[0] } };
  }
  const { name, phone, machine: code, problem, voice, store: slug } = parsed.data;

  const store = await getStoreBySlug(slug);
  if (!store || !store.active) return { error: "Lavanderia não encontrada." };
  const [machine, visitorToken, user] = await Promise.all([
    code ? getMachineByCode(store.id, code) : Promise.resolve(null),
    ensureVisitorToken(),
    getSessionUser(),
  ]);
  const problemType = problem && isProblemType(problem) ? problem : null;

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
    params.set("primeira", `${PROBLEMS[problemType].chip}${machine ? ` (máquina ${machine.code})` : ""}`);
  }
  if (voice === "1") params.set("voz", "1");
  redirect(`/atendimento/${conv.id}${params.size ? `?${params}` : ""}`);
}
