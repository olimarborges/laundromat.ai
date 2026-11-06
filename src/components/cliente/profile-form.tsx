"use client";
import { useActionState, useState } from "react";
import { Check, Loader2, UserRound } from "lucide-react";
import { updateMyProfile, type ProfileState } from "@/app/[loja]/actions";
import { GlassCard } from "@/components/glass/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Nome e celular usados automaticamente nos atendimentos. */
export function ProfileForm({ name, phone, email }: { name: string | null; phone: string | null; email: string | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateMyProfile, {});
  const [tel, setTel] = useState(maskPhone(phone ?? ""));
  return (
    <GlassCard tone="strong" padding="lg">
      <form action={action} className="space-y-3.5">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" aria-hidden />
          <h2 className="font-semibold">Meus dados</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Usados nos atendimentos, sem precisar digitar de novo.{email ? ` Conta: ${email}` : ""}
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="pf-name">Nome</Label>
          <Input
            id="pf-name"
            name="name"
            autoComplete="name"
            defaultValue={name ?? ""}
            className="h-11 bg-background/70 text-base"
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
          {state.fieldErrors?.name ? <p role="alert" className="text-sm text-destructive">{state.fieldErrors.name}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pf-phone">Celular</Label>
          <Input
            id="pf-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={tel}
            onChange={(e) => setTel(maskPhone(e.target.value))}
            placeholder="(51) 99999-9999"
            className="h-11 bg-background/70 text-base tabular-nums"
            aria-invalid={Boolean(state.fieldErrors?.phone)}
          />
          {state.fieldErrors?.phone ? <p role="alert" className="text-sm text-destructive">{state.fieldErrors.phone}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Salvar
          </button>
          {state.message ? (
            <p role="status" className={state.ok ? "flex items-center gap-1 text-sm text-success" : "text-sm text-destructive"}>
              {state.ok ? <Check className="size-4" aria-hidden /> : null}
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </GlassCard>
  );
}
