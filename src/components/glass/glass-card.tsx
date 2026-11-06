import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCard = cva("glass-sheen rounded-3xl", {
  variants: {
    tone: {
      default: "glass",
      strong: "glass-strong",
      subtle: "glass-subtle",
    },
    padding: { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-7" },
    interactive: {
      true: "transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none",
      false: "",
    },
  },
  defaultVariants: { tone: "default", padding: "md", interactive: false },
});

export interface GlassCardProps extends React.ComponentProps<"div">, VariantProps<typeof glassCard> {}

export function GlassCard({ className, tone, padding, interactive, ...props }: GlassCardProps) {
  return <div data-slot="glass-card" className={cn(glassCard({ tone, padding, interactive }), className)} {...props} />;
}

export { glassCard };
