import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LiquidBackground } from "@/components/glass/liquid-background";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

// Dados sempre ao vivo (Supabase); sem prerender estático de páginas com dados.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "EasyWash · Atendimento", template: "%s · EasyWash" },
  description: "Assistente virtual da lavanderia EasyWash: resolva problemas pelo celular, sem baixar aplicativo.",
  applicationName: "EasyWash",
  appleWebApp: { capable: true, title: "EasyWash", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#060b1a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <LiquidBackground />
            {children}
            <Toaster position="top-center" richColors closeButton />
            <RegisterServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
