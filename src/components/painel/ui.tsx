import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[1.7rem]">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <GlassCard padding="md" className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-xl",
            tone === "default" && "bg-primary/10 text-primary",
            tone === "warning" && "bg-warning/15 text-warning",
            tone === "danger" && "bg-destructive/12 text-destructive",
            tone === "success" && "bg-success/12 text-success",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </GlassCard>
  );
}

export function GridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-3xl" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <GlassCard padding="lg" className="flex flex-col items-center gap-2 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="font-semibold">{title}</p>
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
    </GlassCard>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return priority === "critical" ? (
    <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[0.7rem] font-semibold text-destructive">Urgente</span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">Normal</span>
  );
}

const CASE_STATUS: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-primary/10 text-primary" },
  waiting_owner: { label: "Aguardando você", className: "bg-warning/15 text-warning" },
  resolved: { label: "Resolvido", className: "bg-success/12 text-success" },
  dismissed: { label: "Descartado", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", className: "bg-warning/15 text-warning" },
  approved: { label: "Aprovada", className: "bg-success/12 text-success" },
  executed: { label: "Executada", className: "bg-success/12 text-success" },
  rejected: { label: "Recusada", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = CASE_STATUS[status] ?? { label: status, className: "bg-muted" };
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", s.className)}>{s.label}</span>;
}
