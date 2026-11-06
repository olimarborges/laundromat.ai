import { ShieldCheck } from "lucide-react";
import { StoreFinder } from "@/components/lojas/store-finder";
import { listPublicStores } from "@/server/store";

export const metadata = { title: "Encontre sua lavanderia" };

/** Tela inicial: escolher a lavanderia pelo mapa, pelo nome ou pela localização. */
export default async function FinderPage() {
  const stores = await listPublicStores();
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">
          Em qual lavanderia você está?
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha no mapa, busque pelo nome ou leia o QR Code da máquina (ele já abre a lavanderia certa).
        </p>
      </div>
      <StoreFinder stores={stores} />
      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Sua localização é usada só no seu celular para ordenar as lavanderias por distância. Não guardamos.
      </p>
    </div>
  );
}
