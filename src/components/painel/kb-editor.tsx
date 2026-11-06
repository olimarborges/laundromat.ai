"use client";
import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveKbArticle, toggleKbArticle } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlassCard } from "@/components/glass/glass-card";
import type { KbArticleRow } from "@/server/types";

export function KbEditor({ articles }: { articles: KbArticleRow[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ArticleDialog trigger={<Button className="h-10"><Plus className="size-4" /> Nova resposta</Button>} />
      </div>
      <GlassCard tone="strong" padding="none" className="divide-y divide-border/60 overflow-hidden">
        {articles.map((a) => (
          <div key={a.id} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">{a.category}</span>
                {a.needs_review ? (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.7rem] font-semibold text-warning">Revisar</span>
                ) : null}
              </div>
              <p className="text-sm font-semibold">{a.question}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{a.answer}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Switch
                checked={a.active}
                disabled={pending}
                aria-label={a.active ? "Desativar resposta" : "Ativar resposta"}
                onCheckedChange={(v) => start(async () => void toast.success((await toggleKbArticle(a.id, v)).message))}
              />
              <ArticleDialog
                article={a}
                trigger={
                  <Button variant="ghost" size="icon-lg" aria-label={`Editar: ${a.question}`}>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

function ArticleDialog({ article, trigger }: { article?: KbArticleRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="glass-strong max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>{article ? "Editar resposta" : "Nova resposta"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveKbArticle({
                id: article?.id,
                category: String(f.get("category")),
                question: String(f.get("question")),
                answer: String(f.get("answer")),
                tags: String(f.get("tags")),
                active: article?.active ?? true,
              });
              if (r.ok) {
                toast.success(r.message);
                setOpen(false);
              } else toast.error(r.message);
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" name="category" defaultValue={article?.category ?? "Uso das máquinas"} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="question">Pergunta do cliente</Label>
            <Input id="question" name="question" defaultValue={article?.question} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="answer">Resposta (o atendente usa este texto)</Label>
            <Textarea id="answer" name="answer" defaultValue={article?.answer} className="min-h-32" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tags">Palavras-chave (separadas por vírgula)</Label>
            <Input id="tags" name="tags" defaultValue={article?.tags.join(", ")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
