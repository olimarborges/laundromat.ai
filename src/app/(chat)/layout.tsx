import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

/** Tela cheia para o atendimento (sem cabeçalho/barra da loja). */
export default function ChatLayout({ children }: LayoutProps<"/">) {
  return <main className="min-h-dvh">{isSupabaseConfigured() ? children : <SetupNotice />}</main>;
}
