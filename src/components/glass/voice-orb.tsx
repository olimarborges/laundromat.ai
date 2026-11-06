"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/** "Orb" do assistente: bolha líquida que reage ao estado da conversa. */
export function VoiceOrb({ state, className }: { state: OrbState; className?: string }) {
  const reduce = useReducedMotion();
  const pulse =
    state === "listening"
      ? { scale: [1, 1.12, 0.96, 1.08, 1], transition: { duration: 1.6, repeat: Infinity } }
      : state === "speaking"
        ? { scale: [1, 1.06, 1, 1.09, 1], transition: { duration: 0.9, repeat: Infinity } }
        : state === "thinking"
          ? { rotate: 360, transition: { duration: 3.2, repeat: Infinity, ease: "linear" as const } }
          : { scale: [1, 1.03, 1], transition: { duration: 4, repeat: Infinity } };

  return (
    <div className={cn("relative grid place-items-center", className)} aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,var(--aqua),var(--primary),#a78bfa,var(--aqua))] opacity-80 blur-md"
        animate={reduce ? undefined : pulse}
      />
      <motion.div
        className="relative size-[86%] rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.95),rgba(255,255,255,0.25)_32%,transparent_60%),conic-gradient(from_90deg,var(--primary),var(--aqua),var(--primary))] shadow-[inset_0_-8px_18px_rgba(0,0,0,0.18),0_8px_24px_-6px_rgba(37,99,235,0.6)]"
        animate={reduce ? undefined : state === "thinking" ? { scale: [1, 0.94, 1], transition: { duration: 1.2, repeat: Infinity } } : undefined}
      />
      {state === "listening" && !reduce ? (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-aqua"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
    </div>
  );
}
