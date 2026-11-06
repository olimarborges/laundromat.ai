"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversationForViewer } from "@/server/support";

export async function verifyOtp(conversationId: string, compensationId: string, code: string) {
  const conv = await getConversationForViewer(conversationId);
  if (!conv) return { ok: false, message: "Atendimento não encontrado." };
  const db = createAdminClient();
  const { data: comp } = await db
    .from("compensations")
    .select("id, otp_code, conversation_id")
    .eq("id", compensationId)
    .eq("conversation_id", conv.id)
    .maybeSingle();
  if (!comp) return { ok: false, message: "Compensação não encontrada." };
  if (!comp.otp_code || comp.otp_code !== code.replace(/\D/g, "")) {
    return { ok: false, message: "Código incorreto. Confira o SMS." };
  }
  await Promise.all([
    db.from("compensations").update({ otp_verified: true }).eq("id", comp.id),
    db.from("conversations").update({ phone_verified: true }).eq("id", conv.id),
  ]);
  return { ok: true, message: "Celular confirmado." };
}

export async function markResolved(conversationId: string) {
  const conv = await getConversationForViewer(conversationId);
  if (!conv || conv.status === "escalated") return { ok: false };
  await createAdminClient()
    .from("conversations")
    .update({ status: "resolved", resolved_by: "assistant", resolved_at: new Date().toISOString() })
    .eq("id", conv.id);
  return { ok: true };
}
