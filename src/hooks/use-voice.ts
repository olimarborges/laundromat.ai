"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voz pelo navegador com a Web Speech API (gratuita). No Chrome o reconhecimento é feito
 * pelos servidores do Google; no Edge, pelos da Microsoft. Nada passa pelo nosso servidor.
 *
 * - useDictation: ditado contínuo; o texto vai sendo escrito (parcial + final) e quem usa decide quando enviar.
 * - useSpeaker: lê as respostas em voz alta, preferindo a voz "Google português do Brasil".
 */

type ResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
};

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribeNoop = () => () => {};

/** Mensagem clara para cada falha do reconhecimento. */
export function dictationErrorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "O microfone está bloqueado. Clique no ícone de microfone (ou cadeado) na barra de endereço, permita o acesso e tente de novo.";
    case "audio-capture":
      return "Não encontrei um microfone. Conecte um microfone (ou fone com microfone) e tente de novo.";
    case "network":
      return "Este navegador não conseguiu usar o serviço de voz do Google. Abra no Google Chrome ou no Microsoft Edge e verifique sua internet.";
    case "no-speech":
      return "Não ouvi nada. Toque no microfone e fale perto dele.";
    case "language-not-supported":
      return "Este navegador não reconhece português. Use o Google Chrome ou o Microsoft Edge.";
    case "unsupported":
      return "Este navegador não tem reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge (no celular, abra o link no Chrome).";
    case "aborted":
      return null;
    default:
      return "Não consegui ouvir agora. Tente de novo ou digite a mensagem.";
  }
}

export type DictationState = "idle" | "starting" | "listening";

/**
 * Ditado contínuo em pt-BR. `onTranscript` recebe o texto da sessão inteira
 * (finais + parcial atual) a cada novo resultado.
 */
export function useDictation(onTranscript: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNoop, () => getCtor() !== null, () => false);
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const cbRef = useRef(onTranscript);

  useEffect(() => {
    cbRef.current = onTranscript;
  }, [onTranscript]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    setError(null);
    if (!Ctor) {
      setError(dictationErrorMessage("unsupported"));
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setState("listening");
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      cbRef.current(text.replace(/\s+/g, " ").trimStart());
    };
    rec.onerror = (e) => {
      const msg = dictationErrorMessage(e.error);
      if (msg) setError(msg);
      if (process.env.NODE_ENV !== "production") console.warn("[voz]", e.error, e.message);
    };
    rec.onend = () => {
      recRef.current = null;
      setState("idle");
    };
    recRef.current = rec;
    setState("starting");
    try {
      rec.start();
    } catch {
      setState("idle");
      setError(dictationErrorMessage("default"));
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, state, listening: state !== "idle", error, clearError: () => setError(null), start, stop };
}

export function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[✔✖–•#>*_`]/g, " ")
    .replace(/\b([LS])(\d)\b/g, "$1 $2")
    .replace(/R\$\s?(\d+),(\d{2})/g, "$1 reais e $2 centavos")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escolhe a melhor voz pt-BR disponível (Google primeiro). */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const br = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("pt-br"));
  return (
    br.find((v) => /google/i.test(v.name)) ??
    br.find((v) => /natural|online/i.test(v.name)) ??
    br[0] ??
    voices.find((v) => v.lang.toLowerCase().startsWith("pt"))
  );
}

export function useSpeaker() {
  const supported = useSyncExternalStore(subscribeNoop, () => "speechSynthesis" in window, () => false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voiceRef.current = pickVoice(synth.getVoices());
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    u.lang = "pt-BR";
    u.rate = 1.05;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, stop };
}
