import {
  ArrowLeftRight, CreditCard, DoorClosed, Droplets, Hourglass, MessageCircleQuestion, PawPrint, PlayCircle,
  Shirt, Wind, WifiOff, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  ArrowLeftRight, CreditCard, DoorClosed, Droplets, Hourglass, MessageCircleQuestion, PawPrint, PlayCircle, Shirt, Wind, WifiOff,
};

/** Ícone por nome (catálogo de problemas guarda o nome como string). */
export function ProblemIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? MessageCircleQuestion;
  return <Icon className={className} aria-hidden />;
}
