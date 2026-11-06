"use client";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        // Recarga completa: com Cache Components as telas ficam guardadas em <Activity>.
        window.location.href = redirectTo;
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 text-sm font-medium text-destructive"
    >
      <LogOut className="size-4" aria-hidden /> Sair da conta
    </button>
  );
}
