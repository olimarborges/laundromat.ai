"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function LoginForm({ next = "/conta", allowPassword = false }: { next?: string; allowPassword?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const google = () =>
    start(async () => {
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
      if (error) toast.error("Login com Google indisponível. Configure o provedor no Supabase.");
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const supabase = createClient();
      if (allowPassword && password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error("E-mail ou senha incorretos.");
        else {
          router.replace(next);
          router.refresh();
        }
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
      if (error) toast.error(error.message);
      else setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="space-y-2 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-success" aria-hidden />
        <p className="font-semibold">Enviamos um link para {email}</p>
        <p className="text-sm text-muted-foreground">Abra o e-mail neste celular e toque no link para entrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={google}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border bg-background/80 font-medium transition active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleIcon /> Continuar com Google
      </button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> ou <Separator className="flex-1" />
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-background/70 text-base"
            placeholder="voce@email.com"
          />
        </div>
        {allowPassword ? (
          <div className="grid gap-1.5">
            <Label htmlFor="password">
              Senha <span className="font-normal text-muted-foreground">(ou deixe vazio para receber um link)</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-background/70 text-base"
            />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending || !email}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mail className="size-5" aria-hidden />}
          {allowPassword && password ? "Entrar" : "Receber link de acesso"}
        </button>
      </form>
    </div>
  );
}
