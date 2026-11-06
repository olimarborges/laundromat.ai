import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getStoreById } from "@/server/store";
import { getSessionUser } from "@/server/auth";
import { getConversationForViewer, getMachineById, loadMessages, saveMessages } from "@/server/support";
import { makeTools, type AssistantContext } from "@/server/assistant/tools";
import { buildInstructions } from "@/server/assistant/prompt";
import { scriptReply } from "@/server/assistant/script";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.unknown(),
});

const MAX_USER_MESSAGES = 60;
const generateId = createIdGenerator({ prefix: "msg", size: 16 });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Requisição inválida", { status: 400 });

  const conversation = await getConversationForViewer(parsed.data.conversationId);
  if (!conversation) return new Response("Atendimento não encontrado", { status: 404 });

  const [store, machine, previous, user] = await Promise.all([
    getStoreById(conversation.store_id),
    getMachineById(conversation.machine_id),
    loadMessages(conversation.id),
    getSessionUser(),
  ]);

  if (previous.filter((m) => m.role === "user").length >= MAX_USER_MESSAGES) {
    return new Response("Limite de mensagens deste atendimento atingido. Abra um novo atendimento.", { status: 429 });
  }

  const ctx: AssistantContext = {
    store,
    conversation,
    machine,
    isCustomer: Boolean(user && conversation.customer_id === user.id),
  };
  const tools = makeTools(ctx);
  const messages = await validateUIMessages<UIMessage>({
    messages: [...previous, parsed.data.message],
    tools,
  });
  const last = messages.at(-1);
  if (!last || last.role !== "user") return new Response("Mensagem inválida", { status: 400 });

  const persist = async ({ messages: all }: { messages: UIMessage[] }) => {
    await saveMessages(conversation.id, all.slice(previous.length));
  };

  // ── Modo roteiro (sem chave de IA ou forçado) ──
  if (!process.env.ANTHROPIC_API_KEY || conversation.mode === "script") {
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ");
    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      generateId,
      execute: async ({ writer }) => {
        const reply = await scriptReply(ctx, text, previous.length === 0);
        const id = generateId();
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: reply });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish-step" });
      },
      onEnd: persist,
      onError: (e) => (e instanceof Error ? e.message : "Erro no atendimento."),
    });
    return createUIMessageStreamResponse({ stream });
  }

  // ── Modo IA (Claude) ──
  const result = streamText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5"),
    instructions: buildInstructions(ctx),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(8),
    providerOptions: { anthropic: { effort: "low" } },
  });
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      generateMessageId: generateId,
      onEnd: persist,
      onError: (e) => {
        console.error("[chat]", e);
        return "Tive um problema para responder agora. Tente de novo em instantes.";
      },
    }),
  });
}
