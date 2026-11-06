"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowUp, CheckCheck, Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";
import { RichText } from "@/components/chat/rich-text";
import { ToolPart } from "@/components/chat/tool-part";
import { OutcomePanel } from "@/components/chat/outcome-panel";
import { VoiceOrb, type OrbState } from "@/components/glass/voice-orb";
import { ProblemIcon } from "@/components/icon";
import { useVoice } from "@/hooks/use-voice";
import { PROBLEM_LIST } from "@/domain/problems";
import { cn } from "@/lib/utils";

interface Props {
  conversationId: string;
  initialMessages: UIMessage[];
  visitorName: string | null;
  machineLabel: string | null;
  mode: "ai" | "script";
  firstMessage?: string;
  startWithVoice?: boolean;
  resolved: boolean;
}

export function ChatView({
  conversationId,
  initialMessages,
  visitorName,
  machineLabel,
  mode,
  firstMessage,
  startWithVoice,
  resolved,
}: Props) {
  const [input, setInput] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(Boolean(startWithVoice));
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentFirst = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { conversationId, message: messages[messages.length - 1] },
        }),
      }),
    [conversationId],
  );

  const voiceRef = useRef<{ speak: (t: string) => void } | null>(null);
  const voiceRepliesRef = useRef(voiceReplies);
  useEffect(() => {
    voiceRepliesRef.current = voiceReplies;
  }, [voiceReplies]);

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      setRefreshKey((k) => k + 1);
      if (voiceRepliesRef.current) {
        const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ");
        if (text.trim()) voiceRef.current?.speak(text);
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      sendMessage({ text: t });
      setInput("");
    },
    [busy, sendMessage],
  );

  const voice = useVoice((text) => {
    setVoiceReplies(true);
    send(text);
  });
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  // Primeira mensagem vinda do formulário (chip escolhido) + limpa a URL.
  useEffect(() => {
    if (sentFirst.current) return;
    sentFirst.current = true;
    if (firstMessage && initialMessages.length === 0) {
      sendMessage({ text: firstMessage });
    } else if (initialMessages.length === 0) {
      sendMessage({ text: "Olá" });
    }
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [firstMessage, initialMessages.length, sendMessage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const orb: OrbState =
    voice.state === "listening" ? "listening" : voice.state === "speaking" ? "speaking" : busy ? "thinking" : "idle";

  const showChips = !busy && messages.filter((m) => m.role === "user").length <= 1;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="fixed inset-0 z-30 mx-auto flex h-dvh w-full max-w-lg flex-col">
      {/* Cabeçalho */}
      <header className="pt-safe px-3">
        <div className="glass mt-2 flex items-center gap-2 rounded-2xl p-1.5 pr-2">
          <Link href="/" aria-label="Voltar ao início" className="flex size-10 items-center justify-center rounded-xl hover:bg-muted/60">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <VoiceOrb state={orb} className="size-9" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">Assistente EasyWash</p>
            <p className="truncate text-xs text-muted-foreground">
              {busy ? "digitando…" : "assistente virtual"}
              {machineLabel ? ` · ${machineLabel}` : ""}
              {mode === "script" ? " · modo roteiro" : ""}
            </p>
          </div>
          {voice.ttsSupported ? (
            <button
              type="button"
              onClick={() => {
                if (voiceReplies) voice.stopSpeaking();
                setVoiceReplies((v) => !v);
              }}
              aria-pressed={voiceReplies}
              aria-label={voiceReplies ? "Desligar respostas em voz alta" : "Ouvir as respostas em voz alta"}
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60"
            >
              {voiceReplies ? <Volume2 className="size-5 text-primary" /> : <VolumeX className="size-5" />}
            </button>
          ) : null}
        </div>
      </header>

      <OutcomePanel conversationId={conversationId} refreshKey={refreshKey} />

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-4" aria-live="polite">
        <ul className="flex flex-col gap-3">
          {messages
            .filter((m, i) => !(i === 0 && m.role === "user" && messageText(m) === "Olá"))
            .map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          {status === "submitted" ? (
            <li className="glass w-fit rounded-3xl rounded-bl-lg px-4 py-3" aria-label="O assistente está digitando">
              <TypingDots />
            </li>
          ) : null}
        </ul>
        {error ? (
          <div role="alert" className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-3 text-sm">
            Não consegui responder.{" "}
            <button type="button" className="font-semibold underline" onClick={() => regenerate()}>
              Tentar de novo
            </button>
          </div>
        ) : null}
        {resolved ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <CheckCheck className="size-4" aria-hidden /> Atendimento encerrado
          </p>
        ) : null}
      </div>

      {/* Chips + entrada */}
      <div className="pb-safe px-3">
        <AnimatePresence>
          {showChips && lastAssistant ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="-mx-3 mb-2 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]"
            >
              {PROBLEM_LIST.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => send(p.chip)}
                  className="glass-subtle inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium active:scale-95"
                >
                  <ProblemIcon name={p.icon} className="size-3.5 text-primary" />
                  {p.chip}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {voice.state === "listening" ? (
          <div className="glass-strong mb-2 flex items-center gap-3 rounded-2xl p-3">
            <VoiceOrb state="listening" className="size-10" />
            <p className="flex-1 text-sm text-muted-foreground">{voice.interim || "Pode falar, estou ouvindo…"}</p>
            <button
              type="button"
              onClick={voice.stopListening}
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              aria-label="Parar de ouvir"
            >
              <MicOff className="size-5" />
            </button>
          </div>
        ) : null}
        {voice.error ? <p className="mb-1 px-1 text-xs text-destructive">{voice.error}</p> : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="glass-strong mb-2 flex items-end gap-1.5 rounded-[1.6rem] p-1.5"
        >
          {voice.supported ? (
            <button
              type="button"
              onClick={voice.state === "listening" ? voice.stopListening : voice.listen}
              disabled={busy}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50",
                voice.state === "listening" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
              )}
              aria-label={voice.state === "listening" ? "Parar de ouvir" : "Falar por voz"}
            >
              <Mic className="size-5" />
            </button>
          ) : null}
          <label htmlFor="chat-input" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={`Escreva aqui${visitorName ? `, ${visitorName.split(" ")[0]}` : ""}…`}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/90 text-background"
              aria-label="Parar resposta"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition active:scale-95 disabled:opacity-40"
              aria-label="Enviar"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function messageText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const hasContent = message.parts.some((p) => (p.type === "text" && p.text.trim()) || isToolUIPart(p));
  if (!hasContent) return null;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn("flex max-w-[88%] flex-col gap-2", isUser ? "self-end items-end" : "self-start")}
    >
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return (
            <div
              key={i}
              className={cn(
                "rounded-3xl px-4 py-2.5 text-[0.95rem] leading-relaxed",
                isUser
                  ? "rounded-br-lg bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "glass-strong rounded-bl-lg",
              )}
            >
              {isUser ? part.text : <RichText text={part.text} />}
            </div>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <div key={part.toolCallId} className="w-full">
              <ToolPart
                name={getToolName(part)}
                state={part.state}
                output={"output" in part ? part.output : undefined}
                errorText={"errorText" in part ? part.errorText : undefined}
              />
            </div>
          );
        }
        return null;
      })}
    </motion.li>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full bg-muted-foreground/70"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
