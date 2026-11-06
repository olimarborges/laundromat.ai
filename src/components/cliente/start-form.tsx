"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Loader2, Mic, WashingMachine, Wind } from "lucide-react";
import { startConversation, type StartState } from "@/app/[loja]/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProblemIcon } from "@/components/icon";
import { PROBLEM_LIST } from "@/domain/problems";
import type { MachineOption } from "@/server/machines-public";
import { cn } from "@/lib/utils";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function StartForm({
  storeSlug,
  machines,
  defaultMachine,
  defaultProblem,
  defaultName,
  defaultPhone,
  voice,
}: {
  storeSlug: string;
  machines: MachineOption[];
  defaultMachine?: string;
  defaultProblem?: string;
  defaultName?: string;
  defaultPhone?: string;
  voice?: boolean;
}) {
  const [state, action, pending] = useActionState<StartState, FormData>(startConversation, {});
  const [machine, setMachine] = useState(defaultMachine ?? "");
  const [problem, setProblem] = useState(defaultProblem ?? "");
  const [phone, setPhone] = useState(maskPhone(defaultPhone ?? ""));

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="store" value={storeSlug} />
      <input type="hidden" name="machine" value={machine} />
      <input type="hidden" name="problem" value={problem} />
      <input type="hidden" name="voice" value={voice ? "1" : ""} />

      <div className="grid gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Seu nome</Label>
          <Input
            id="name"
            name="name"
            autoComplete="given-name"
            defaultValue={defaultName}
            placeholder="Como podemos te chamar?"
            className="h-12 rounded-xl bg-background/70 text-base"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
            required
          />
          {state.fieldErrors?.name ? (
            <p id="name-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Celular (para receber a resposta)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(51) 99999-9999"
            className="h-12 rounded-xl bg-background/70 text-base tabular-nums"
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            aria-describedby={state.fieldErrors?.phone ? "phone-error" : "phone-help"}
            required
          />
          {state.fieldErrors?.phone ? (
            <p id="phone-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.phone}
            </p>
          ) : (
            <p id="phone-help" className="text-xs text-muted-foreground">
              Usado só neste atendimento. Sem cadastro.
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Qual máquina? <span className="font-normal text-muted-foreground">(se for o caso)</span>
        </legend>
        <div className="grid grid-cols-4 gap-2" role="radiogroup">
          {machines.map((m) => {
            const selected = machine === m.code;
            const Icon = m.kind === "washer" ? WashingMachine : Wind;
            return (
              <button
                key={m.code}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={m.label}
                onClick={() => setMachine(selected ? "" : m.code)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-semibold transition active:scale-95",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "glass-subtle hover:border-primary/40",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {m.code}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Sobre o que você quer falar? <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {PROBLEM_LIST.map((p) => {
            const selected = problem === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setProblem(selected ? "" : p.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[0.82rem] font-medium transition active:scale-95",
                  selected ? "border-primary bg-primary text-primary-foreground" : "glass-subtle hover:border-primary/40",
                )}
              >
                <ProblemIcon name={p.icon} className="size-3.5" />
                {p.chip}
              </button>
            );
          })}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : voice ? (
          <Mic className="size-5" aria-hidden />
        ) : null}
        {pending ? "Abrindo atendimento…" : voice ? "Começar por voz" : "Começar atendimento"}
        {!pending && !voice ? <ArrowRight className="size-5" aria-hidden /> : null}
      </button>
    </form>
  );
}
