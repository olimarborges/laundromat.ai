"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { addStoreOwner, removeStoreOwner } from "@/app/admin/actions";
import { GlassCard } from "@/components/glass/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Donos vinculados à lavanderia (um dono pode ter várias; uma loja pode ter vários donos). */
export function StoreOwners({
  storeId,
  owners,
}: {
  storeId: string;
  owners: { id: string; email: string | null; name: string | null; otherStores: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message, { duration: 7000 });
        after?.();
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <GlassCard tone="strong" padding="lg" className="space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Users className="size-4 text-primary" aria-hidden /> Donos desta lavanderia
      </h2>
      {owners.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dono vinculado ainda.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border bg-background/40">
          {owners.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.name ?? o.email ?? "Dono"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {o.email}
                  {o.otherStores ? ` · dono de mais ${o.otherStores} lavanderia(s)` : ""}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Desvincular ${o.email ?? "dono"}`}
                disabled={pending}
                onClick={() => {
                  if (confirm("Desvincular este dono desta lavanderia?")) run(() => removeStoreOwner(storeId, o.id));
                }}
              >
                <UserMinus className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addStoreOwner(storeId, email, password || undefined), () => {
            setEmail("");
            setPassword("");
          });
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="new-owner">Adicionar dono (e-mail)</Label>
          <Input id="new-owner" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="socio@lavanderia.com" className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-owner-pw">Senha provisória (só se a pessoa ainda não tem conta)</Label>
          <Input id="new-owner-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" disabled={pending || !email} className="h-11">
          <UserPlus className="size-4" /> Vincular dono
        </Button>
        <p className="text-xs text-muted-foreground">
          Se a pessoa já é dona de outra lavanderia, ela passa a ver as duas no painel e pode alternar entre elas.
        </p>
      </form>
    </GlassCard>
  );
}
