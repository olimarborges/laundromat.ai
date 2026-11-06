import { getConversationForViewer, getConversationOutcome } from "@/server/support";

/** Estado do atendimento para a tela do cliente (polling leve). */
export async function GET(_req: Request, ctx: RouteContext<"/api/atendimento/[id]/status">) {
  const { id } = await ctx.params;
  const conv = await getConversationForViewer(id);
  if (!conv) return Response.json({ error: "not_found" }, { status: 404 });
  const { cases, compensations } = await getConversationOutcome(conv.id);
  return Response.json(
    {
      status: conv.status,
      resolvedBy: conv.resolved_by,
      phoneVerified: conv.phone_verified,
      cases: cases.map((c) => ({
        id: c.id,
        title: c.title,
        priority: c.priority,
        status: c.status,
        notifyAt: c.notify_at,
        resolution: c.resolution,
      })),
      compensations: compensations.map((c) => ({
        id: c.id,
        kind: c.kind,
        status: c.status,
        amountCents: c.amount_cents,
        ownerNote: c.owner_note,
        otpVerified: c.otp_verified,
        // SMS simulado: no protótipo o código aparece na tela. Em produção vai por SMS e nunca é exposto aqui.
        simulatedSmsCode: !c.otp_verified && c.status === "pending" ? c.otp_code : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
