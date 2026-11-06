import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ChatView } from "@/components/chat/chat-view";
import { getConversationForViewer, getMachineById, loadMessages } from "@/server/support";
import { getStoreById } from "@/server/store";
import { getStoreProblems } from "@/server/problems";
import { toChip } from "@/domain/problems";

export const metadata = { title: "Atendimento" };

export default function AtendimentoPage({ params, searchParams }: PageProps<"/atendimento/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-label="Carregando atendimento" />
        </div>
      }
    >
      <Chat params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Chat({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const conv = await getConversationForViewer(id);
  if (!conv) notFound();
  const [messages, machine, store, problems] = await Promise.all([
    loadMessages(conv.id),
    getMachineById(conv.machine_id),
    getStoreById(conv.store_id),
    getStoreProblems(conv.store_id),
  ]);
  const first = typeof sp.primeira === "string" ? sp.primeira.slice(0, 200) : undefined;

  return (
    <ChatView
      conversationId={conv.id}
      storeSlug={store.slug}
      storeName={store.name}
      chips={problems.map(toChip)}
      initialMessages={messages}
      visitorName={conv.visitor_name}
      machineLabel={machine?.label ?? null}
      mode={conv.mode}
      firstMessage={first}
      startWithVoice={sp.voz === "1"}
      resolved={conv.status === "resolved"}
    />
  );
}
