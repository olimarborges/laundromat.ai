"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lightbulb, Pencil, Plus, Search, Send, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  createProblem,
  deleteProblem,
  saveStoreSolution,
  setProblemAllStores,
  suggestProblem,
  toggleProblemStore,
  updateProblem,
  type ProblemInput,
} from "@/app/painel/problem-actions";
import { GlassCard } from "@/components/glass/glass-card";
import { ProblemIcon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PROBLEM_ICONS, solutionToSteps } from "@/domain/problems";
import { cn } from "@/lib/utils";

export interface ManagerProblem {
  id: string;
  title: string;
  chip: string;
  icon: string;
  solution: string;
  alwaysNotify: boolean;
  needsMachine: boolean;
  builtin: boolean;
  visibility: "private" | "pending" | "public";
  mine: boolean;
  community: boolean;
  /** storeId → solução ajustada (null = usa a padrão). Ausente = problema desligado na loja. */
  stores: Record<string, string | null>;
}

type Store = { id: string; name: string; slug: string; city: string | null };
type Filter = "todos" | "plataforma" | "comunidade" | "meus";

export function ProblemsManager({
  stores,
  problems,
  activeStoreId,
}: {
  stores: Store[];
  problems: ManagerProblem[];
  activeStoreId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ManagerProblem | "new" | null>(null);
  const [adjust, setAdjust] = useState<{ problem: ManagerProblem; store: Store } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.message);
    });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (filter === "plataforma" && !p.builtin) return false;
      if (filter === "comunidade" && !p.community) return false;
      if (filter === "meus" && !p.mine) return false;
      return !q || `${p.title} ${p.chip}`.toLowerCase().includes(q);
    });
  }, [problems, filter, query]);

  const activeCount = (storeId: string) => problems.filter((p) => storeId in p.stores).length;
  const multi = stores.length > 1;

  return (
    <div className="space-y-4">
      {/* Resumo por lavanderia */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {stores.map((s) => (
          <GlassCard key={s.id} padding="sm" className={cn("px-3.5", s.id === activeStoreId && "ring-1 ring-primary/30")}>
            <p className="truncate text-sm font-semibold">{s.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{activeCount(s.id)} problemas ativos</p>
          </GlassCard>
        ))}
      </div>

      {/* Filtros + novo */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass-subtle flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="busca-problema" className="sr-only">
            Buscar problema
          </label>
          <input
            id="busca-problema"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar problema"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <Button className="h-10" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Novo problema
        </Button>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist">
        {(
          [
            ["todos", "Todos"],
            ["plataforma", "Da plataforma"],
            ["comunidade", "Sugeridos por outras lavanderias"],
            ["meus", "Criados por mim"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition",
              filter === key ? "border-primary bg-primary text-primary-foreground" : "bg-background/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <ul className="space-y-3">
        {list.length === 0 ? (
          <li className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
            Nenhum problema aqui ainda.
          </li>
        ) : null}
        {list.map((p) => {
          const onIn = stores.filter((s) => s.id in p.stores);
          return (
            <li key={p.id}>
              <GlassCard tone="strong" padding="md" className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ProblemIcon name={p.icon} className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold">{p.title}</p>
                      {p.builtin ? <Badge tone="muted">Plataforma</Badge> : null}
                      {p.community ? <Badge tone="aqua"><Users className="size-3" aria-hidden /> Comunidade</Badge> : null}
                      {p.mine && p.visibility === "private" ? <Badge tone="primary">Seu</Badge> : null}
                      {p.mine && p.visibility === "pending" ? <Badge tone="warning">Sugestão em análise</Badge> : null}
                      {p.alwaysNotify ? <Badge tone="muted">Sempre avisa você</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">O cliente diz: “{p.chip}”</p>
                  </div>
                  {p.mine && p.visibility !== "public" ? (
                    <div className="flex shrink-0 gap-0.5">
                      <Button variant="ghost" size="icon-lg" aria-label={`Editar ${p.title}`} onClick={() => setEditing(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Excluir ${p.title}`}
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Excluir "${p.title}" de todas as lavanderias?`)) run(() => deleteProblem(p.id));
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <details className="group rounded-2xl bg-muted/40 px-3 py-2 text-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
                    Solução padrão
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                    {solutionToSteps(p.solution).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </details>

                {/* Em quais lavanderias acontece */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {multi ? "Acontece em quais lavanderias?" : "Acontece nesta lavanderia?"}
                    </p>
                    {multi ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setProblemAllStores(p.id, true))}>
                          Todas
                        </Button>
                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setProblemAllStores(p.id, false))}>
                          Nenhuma
                        </Button>
                      </div>
                    ) : (
                      <Switch
                        checked={onIn.length > 0}
                        disabled={pending}
                        aria-label={`Ativar ${p.title} na lavanderia`}
                        onCheckedChange={(v) => run(() => toggleProblemStore(p.id, stores[0].id, v))}
                      />
                    )}
                  </div>
                  {multi ? (
                    <div className="flex flex-wrap gap-2">
                      {stores.map((s) => {
                        const on = s.id in p.stores;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            disabled={pending}
                            onClick={() => run(() => toggleProblemStore(p.id, s.id, !on))}
                            className={cn(
                              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition active:scale-95 disabled:opacity-60",
                              on ? "border-primary bg-primary/10 text-primary" : "bg-background/60 text-muted-foreground",
                            )}
                          >
                            {on ? <Check className="size-3.5" aria-hidden /> : null}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {onIn.length ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {onIn.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setAdjust({ problem: p, store: s })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <SlidersHorizontal className="size-3" aria-hidden />
                          {p.stores[s.id] ? "Solução ajustada" : "Ajustar solução"}
                          {multi ? ` · ${s.name}` : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {p.mine && p.visibility === "private" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => suggestProblem(p.id))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Send className="size-3.5" aria-hidden /> Sugerir para outras lavanderias
                  </button>
                ) : null}
              </GlassCard>
            </li>
          );
        })}
      </ul>

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
        Problemas da plataforma trazem conferências automáticas (pagamento, máquina e câmera). Os criados por você
        orientam o cliente com a sua solução e podem avisar você sempre que acontecerem.
      </p>

      {editing ? (
        <ProblemDialog
          problem={editing === "new" ? null : editing}
          stores={stores}
          activeStoreId={activeStoreId}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(
              () => (editing === "new" ? createProblem(input) : updateProblem(editing.id, input)),
              () => setEditing(null),
            )
          }
        />
      ) : null}

      {adjust ? (
        <AdjustDialog
          key={`${adjust.problem.id}-${adjust.store.id}`}
          problem={adjust.problem}
          store={adjust.store}
          pending={pending}
          onClose={() => setAdjust(null)}
          onSave={(text) => run(() => saveStoreSolution(adjust.problem.id, adjust.store.id, text), () => setAdjust(null))}
        />
      ) : null}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "muted" | "primary" | "warning" | "aqua" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "aqua" && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </span>
  );
}

function ProblemDialog({
  problem,
  stores,
  activeStoreId,
  pending,
  onClose,
  onSave,
}: {
  problem: ManagerProblem | null;
  stores: Store[];
  activeStoreId: string;
  pending: boolean;
  onClose: () => void;
  onSave: (input: ProblemInput) => void;
}) {
  const [icon, setIcon] = useState<(typeof PROBLEM_ICONS)[number]>(
    (PROBLEM_ICONS as readonly string[]).includes(problem?.icon ?? "")
      ? (problem!.icon as (typeof PROBLEM_ICONS)[number])
      : "MessageCircleQuestion",
  );
  const [selected, setSelected] = useState<string[]>(
    problem ? Object.keys(problem.stores) : stores.some((s) => s.id === activeStoreId) ? [activeStoreId] : stores.slice(0, 1).map((s) => s.id),
  );
  const [alwaysNotify, setAlwaysNotify] = useState(problem?.alwaysNotify ?? false);
  const [needsMachine, setNeedsMachine] = useState(problem?.needsMachine ?? false);
  const [suggest, setSuggest] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[92dvh] max-w-lg overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{problem ? "Editar problema" : "Novo problema da sua lavanderia"}</DialogTitle>
          <DialogDescription>O assistente usa estes textos para reconhecer e resolver o problema.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              title: String(f.get("title") ?? ""),
              chip: String(f.get("chip") ?? ""),
              solution: String(f.get("solution") ?? ""),
              icon,
              alwaysNotify,
              needsMachine,
              storeIds: selected,
              suggest,
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="pr-title">Problema</Label>
            <Input id="pr-title" name="title" defaultValue={problem?.title} placeholder="Ex.: Máquina de café sem copo" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pr-chip">Como o cliente fala</Label>
            <Input id="pr-chip" name="chip" defaultValue={problem?.chip} placeholder="Ex.: Acabou o copo do café" required />
            <p className="text-xs text-muted-foreground">Vira um atalho na tela do cliente e ajuda o assistente a reconhecer.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pr-solution">Solução (um passo por linha)</Label>
            <Textarea
              id="pr-solution"
              name="solution"
              defaultValue={problem?.solution}
              className="min-h-28"
              placeholder={"Os copos ficam na gaveta abaixo da máquina.\nSe tiver acabado, avise aqui que eu chamo o responsável."}
              required
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Ícone</legend>
            <div className="flex flex-wrap gap-1.5">
              {PROBLEM_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={icon === name}
                  aria-label={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border transition",
                    icon === name ? "border-primary bg-primary/10 text-primary" : "bg-background/60 text-muted-foreground",
                  )}
                >
                  <ProblemIcon name={name} className="size-[18px]" />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background/50 p-3 text-sm">
            <span>
              <span className="block font-medium">Sempre me avisar</span>
              <span className="text-xs text-muted-foreground">Abre um caso para você toda vez que acontecer.</span>
            </span>
            <Switch checked={alwaysNotify} onCheckedChange={setAlwaysNotify} aria-label="Sempre me avisar" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background/50 p-3 text-sm">
            <span>
              <span className="block font-medium">Envolve uma máquina</span>
              <span className="text-xs text-muted-foreground">O assistente pergunta qual é a máquina.</span>
            </span>
            <Switch checked={needsMachine} onCheckedChange={setNeedsMachine} aria-label="Envolve uma máquina" />
          </label>
          {!problem ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Acontece em quais lavanderias?</legend>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => {
                  const on = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected((cur) => (on ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
                        on ? "border-primary bg-primary/10 text-primary" : "bg-background/60 text-muted-foreground",
                      )}
                    >
                      {on ? <Check className="size-3.5" aria-hidden /> : null}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          {!problem || problem.visibility === "private" ? (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                Sugerir para outras lavanderias
                <span className="block text-xs text-muted-foreground">Passa por aprovação antes de aparecer para outros donos.</span>
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {problem ? "Salvar" : "Criar problema"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({
  problem,
  store,
  pending,
  onClose,
  onSave,
}: {
  problem: ManagerProblem;
  store: Store;
  pending: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(problem.stores[store.id] ?? problem.solution);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>Solução para {store.name}</DialogTitle>
          <DialogDescription>
            {problem.title}. Use quando esta lavanderia for diferente das outras (ex.: outra maquininha).
          </DialogDescription>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" aria-label="Solução" />
        <DialogFooter className="gap-2">
          {problem.stores[store.id] ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onSave("")}>
              Voltar à solução padrão
            </Button>
          ) : null}
          <Button type="button" disabled={pending} onClick={() => onSave(text === problem.solution ? "" : text)}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
