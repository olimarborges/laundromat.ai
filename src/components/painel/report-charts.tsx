"use client";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/** Barras horizontais de série única, ordenadas, com rótulo direto do valor. */
export function RankedBars({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const config = { value: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="w-full" style={{ height: Math.max(160, data.length * 36) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} strokeOpacity={0.35} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="value" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Colunas por hora do dia (horários de pico). */
export function HourBars({ data }: { data: { hour: string; value: number }[] }) {
  const config = { value: { label: "Atendimentos", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} strokeOpacity={0.35} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={1} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/** Semanas empilhadas: resolvidos pelo assistente × pelo lojista (2 séries, legenda + vão entre segmentos). */
export function WhoResolvedBars({ data }: { data: { week: string; assistente: number; lojista: number }[] }) {
  const config = {
    assistente: { label: "Assistente", color: "var(--chart-1)" },
    lojista: { label: "Lojista", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.35} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="assistente" stackId="a" fill="var(--color-assistente)" stroke="var(--card)" strokeWidth={2} radius={[0, 0, 4, 4]} />
        <Bar dataKey="lojista" stackId="a" fill="var(--color-lojista)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
