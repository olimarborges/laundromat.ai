import { Suspense } from "react";
import { connection } from "next/server";
import { Bot, CreditCard, Gift, MessagesSquare } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { GridSkeleton, PageTitle, StatCard } from "@/components/painel/ui";
import { HourBars, RankedBars, WhoResolvedBars } from "@/components/painel/report-charts";
import { requireOwner } from "@/server/auth";
import { getReports } from "@/server/panel";
import { problemTitles } from "@/server/problems";
import { formatBRL } from "@/domain/compensation";
import { zonedParts } from "@/domain/time";

export const metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <div className="space-y-5">
      <PageTitle title="Relatórios" description="Últimos 30 dias. Inclui dados de demonstração marcados como (demo)." />
      <Suspense fallback={<GridSkeleton count={8} />}>
        <Reports />
      </Suspense>
    </div>
  );
}


async function Reports() {
  await connection();
  const user = await requireOwner();
  const r = await getReports(user.profile.store_id!);

  const resolved = r.conversations.filter((c) => c.status === "resolved");
  const byAssistant = resolved.filter((c) => c.resolved_by === "assistant").length;
  const rate = resolved.length ? Math.round((byAssistant / resolved.length) * 100) : 0;

  const countBy = <T,>(items: T[], key: (i: T) => string) =>
    items.reduce<Record<string, number>>((acc, i) => {
      const k = key(i);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const titles = await problemTitles(r.conversations.map((c) => c.problem_type));
  const label = (t: string | null) => (t ? (titles[t] ?? "Outro") : "Outro");
  const byType = Object.entries(countBy(r.conversations, (c) => label(c.problem_type)))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const machineEvents = [
    ...r.conversations.filter((c) => c.machine_id).map((c) => c.machine_id as string),
    ...r.incidents.filter((i) => i.machine_id).map((i) => i.machine_id as string),
  ];
  const byMachine = r.machines
    .map((m) => ({ name: `${m.code}`, value: machineEvents.filter((id) => id === m.id).length }))
    .sort((a, b) => b.value - a.value);

  const hours = countBy(r.conversations, (c) => String(zonedParts(new Date(c.created_at)).hour));
  const byHour = Array.from({ length: 18 }, (_, i) => i + 6).map((h) => ({ hour: `${h}h`, value: hours[String(h)] ?? 0 }));

  const weekKey = (iso: string) => {
    const d = new Date(iso);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };
  const weeks = new Map<string, { week: string; assistente: number; lojista: number }>();
  [...resolved]
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .forEach((c) => {
      const k = weekKey(c.created_at);
      const w = weeks.get(k) ?? { week: k, assistente: 0, lojista: 0 };
      if (c.resolved_by === "assistant") w.assistente++;
      else w.lojista++;
      weeks.set(k, w);
    });

  const terminalFreezes = r.incidents.filter((i) => i.kind === "terminal_frozen").length;
  const compensated = r.compensations
    .filter((c) => c.status === "executed" || c.status === "approved")
    .reduce((s, c) => s + c.amount_cents, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Atendimentos" value={r.conversations.length} hint="30 dias" icon={<MessagesSquare className="size-4" />} />
        <StatCard
          label="Resolvidos sem você"
          value={`${rate}%`}
          hint={`${byAssistant} de ${resolved.length} · meta 70%`}
          icon={<Bot className="size-4" />}
          tone={rate >= 70 ? "success" : "default"}
        />
        <StatCard label="Maquininha travou" value={terminalFreezes} hint="Prova para cobrar o fornecedor" icon={<CreditCard className="size-4" />} tone={terminalFreezes > 3 ? "warning" : "default"} />
        <StatCard label="Compensado" value={formatBRL(compensated)} hint="Antes: R$ 51–150/mês" icon={<Gift className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <GlassCard tone="strong" padding="lg" className="space-y-3">
          <div>
            <h2 className="font-semibold">Problemas e dúvidas mais comuns</h2>
            <p className="text-xs text-muted-foreground">Número de atendimentos por tipo</p>
          </div>
          <RankedBars data={byType} label="Atendimentos" />
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Ver como tabela</summary>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {byType.map((t) => (
                  <tr key={t.name} className="border-b border-border/50">
                    <td className="py-1">{t.name}</td>
                    <td className="py-1 text-right tabular-nums">{t.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </GlassCard>

        <div className="min-w-0 space-y-4">
          <GlassCard tone="strong" padding="lg" className="space-y-3">
            <div>
              <h2 className="font-semibold">Quem resolveu, por semana</h2>
              <p className="text-xs text-muted-foreground">Assistente sozinho × precisou do lojista</p>
            </div>
            <WhoResolvedBars data={[...weeks.values()]} />
          </GlassCard>
          <GlassCard tone="strong" padding="lg" className="space-y-3">
            <div>
              <h2 className="font-semibold">Horários de pico dos problemas</h2>
              <p className="text-xs text-muted-foreground">Atendimentos por hora do dia (6h–23h)</p>
            </div>
            <HourBars data={byHour} />
          </GlassCard>
        </div>

        <GlassCard tone="strong" padding="lg" className="space-y-3">
          <div>
            <h2 className="font-semibold">Máquinas com mais ocorrências</h2>
            <p className="text-xs text-muted-foreground">Atendimentos + erros registrados por máquina</p>
          </div>
          <RankedBars data={byMachine} label="Ocorrências" />
          <p className="text-xs text-muted-foreground">
            {byMachine[0] && byMachine[0].value > 0
              ? `${byMachine[0].name} concentra ${Math.round((byMachine[0].value / Math.max(1, machineEvents.length)) * 100)}% das ocorrências.`
              : null}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
