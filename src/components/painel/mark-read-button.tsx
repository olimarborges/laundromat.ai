"use client";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markNotificationsRead } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

export function MarkReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await markNotificationsRead()))}>
      <CheckCheck className="size-4" /> Marcar lidos
    </Button>
  );
}
