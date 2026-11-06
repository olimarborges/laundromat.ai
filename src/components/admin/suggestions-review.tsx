"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { approveSuggestion, rejectSuggestion } from "@/app/admin/actions";
import { GlassCard } from "@/components/glass/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface Suggestion {
  id: string;
  title: string;
  chip: string;
  solution: string;
  storeName: string | null;
  ownerName: string | null;
  createdAt: string;
}

/** Revisão das sugestões dos donos: ajustar o texto e aprovar (fica público) ou recusar. */
export function SuggestionsReview({ items }: { items: Suggestion[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  if (items.length === 0) {
    return (
      <GlassCard padding="lg" className="text-center text-sm text-muted-foreground">
        Nenhuma sugestão aguardando. Quando um dono marcar “Sugerir para outras lavanderias”, ela aparece aqui.
      </GlassCard>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.id}>
          <GlassCard tone="strong" padding="lg">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(() =>
                  approveSuggestion(s.id, {
                    title: String(f.get("title")),
                    chip: String(f.get("chip")),
                    solution: String(f.get("solution")),
                  }),
                );
              }}
            >
              <p className="text-xs text-muted-foreground">
                Sugerido por {s.ownerName ?? "um dono"}
                {s.storeName ? ` · ${s.storeName}` : ""} · {new Date(s.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor={`t-${s.id}`}>Problema</Label>
                <Input id={`t-${s.id}`} name="title" defaultValue={s.title} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`c-${s.id}`}>Como o cliente fala</Label>
                <Input id={`c-${s.id}`} name="chip" defaultValue={s.chip} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`s-${s.id}`}>Solução (um passo por linha)</Label>
                <Textarea id={`s-${s.id}`} name="solution" defaultValue={s.solution} className="min-h-28" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} className="h-10">
                  <Check className="size-4" /> Aprovar para todas as lavanderias
                </Button>
                <Button type="button" variant="outline" disabled={pending} className="h-10" onClick={() => run(() => rejectSuggestion(s.id))}>
                  <X className="size-4" /> Recusar
                </Button>
              </div>
            </form>
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}
