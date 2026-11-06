"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Voz pelo navegador (Web Speech API): reconhecimento e fala em pt-BR, sem custo. */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribeNoop = () => () => {};

export type VoiceState = "idle" | "listening" | "speaking";

export function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[✔✖–•#>*_`]/g, " ")
    .replace(/\b([LS])(\d)\b/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoice(onFinalTranscript: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNoop, () => getCtor() !== null, () => false);
  const ttsSupported = useSyncExternalStore(subscribeNoop, () => "speechSynthesis" in window, () => false);
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const cbRef = useRef(onFinalTranscript);

  useEffect(() => {
    cbRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState((s) => (s === "speaking" ? "idle" : s));
  }, []);

  const listen = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    stopSpeaking();
    setError(null);
    finalRef.current = "";
    setInterim("");
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else text += r[0].transcript;
      }
      setInterim(finalRef.current + text);
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Permita o uso do microfone para falar comigo."
          : e.error === "no-speech"
            ? "Não ouvi nada. Toque e fale de novo."
            : "Não consegui ouvir. Tente de novo ou digite.",
      );
    };
    rec.onend = () => {
      setState("idle");
      const text = finalRef.current.trim();
      setInterim("");
      if (text) cbRef.current(text);
    };
    recRef.current = rec;
    setState("listening");
    rec.start();
  }, [stopSpeaking]);

  const stopListening = useCallback(() => recRef.current?.stop(), []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    u.lang = "pt-BR";
    u.rate = 1.05;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br"));
    if (voice) u.voice = voice;
    u.onstart = () => setState("speaking");
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
  }, []);

  useEffect(
    () => () => {
      recRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, ttsSupported, state, interim, error, listen, stopListening, speak, stopSpeaking };
}
