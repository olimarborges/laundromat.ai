"use client";
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { KeyRound, LocateFixed, MapPin, Save, Store, WashingMachine } from "lucide-react";
import { toast } from "sonner";
import { createStore, updateStore, type StoreInput } from "@/app/admin/actions";
import { GlassCard } from "@/components/glass/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { slugify } from "@/domain/stores";
import type { StoreRow } from "@/server/types";

const LocationPicker = dynamic(() => import("./location-picker"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function StoreForm({ store }: { store?: StoreRow }) {
  const router = useRouter();
  const editing = Boolean(store);
  const [pending, start] = useTransition();
  const [name, setName] = useState(store?.name ?? "");
  const [slug, setSlug] = useState(store?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    store?.lat != null && store?.lng != null ? { lat: store.lat, lng: store.lng } : null,
  );
  const [active, setActive] = useState(store?.active ?? true);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Não consegui pegar a localização. Clique no mapa para marcar."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );

  return (
    <form
      className="grid gap-4 xl:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const val = (k: string) => String(f.get(k) ?? "");
        const input: StoreInput = {
          name,
          slug: effectiveSlug,
          description: val("description"),
          address: val("address"),
          city: val("city"),
          state: val("state"),
          lat: pos?.lat ?? null,
          lng: pos?.lng ?? null,
          open_time: val("open_time"),
          close_time: val("close_time"),
          owner_email: val("owner_email"),
          owner_password: val("owner_password") || undefined,
          active,
          ...(editing
            ? {}
            : {
                washers: Number(val("washers")),
                dryers: Number(val("dryers")),
                washer_price: Number(val("washer_price").replace(",", ".")),
                dryer_price: Number(val("dryer_price").replace(",", ".")),
              }),
        };
        start(async () => {
          const r = editing ? await updateStore(store!.id, input) : await createStore(input);
          if (!r.ok) {
            toast.error(r.message);
            return;
          }
          toast.success(r.message, { duration: 8000 });
          if (!editing && r.id) router.push(`/admin/lojas/${r.id}`);
          else router.refresh();
        });
      }}
    >
      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Store className="size-4 text-primary" aria-hidden /> Lavanderia
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" placeholder="Ex.: Lava Bem Centro" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="slug">Endereço no app (vai no QR Code)</Label>
          <div className="flex items-center rounded-md border bg-background/60 pl-3 text-sm">
            <span className="text-muted-foreground">/</span>
            <input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className="h-11 flex-1 bg-transparent px-1 outline-none"
              aria-describedby="slug-help"
            />
          </div>
          <p id="slug-help" className="text-xs text-muted-foreground">
            Letras minúsculas, números e hífen. {editing ? "Mudar o endereço invalida QR Codes já impressos." : ""}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="description">Descrição curta</Label>
          <Input id="description" name="description" defaultValue={store?.description ?? ""} className="h-11" placeholder="Self-service · 6 máquinas" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="open_time">Abre</Label>
            <Input id="open_time" name="open_time" type="time" defaultValue={store?.open_time.slice(0, 5) ?? "06:00"} className="h-11" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="close_time">Fecha</Label>
            <Input id="close_time" name="close_time" type="time" defaultValue={store?.close_time.slice(0, 5) ?? "23:00"} className="h-11" required />
          </div>
        </div>
        {editing ? (
          <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background/50 p-3 text-sm">
            <span>
              <span className="block font-medium">Visível para clientes</span>
              <span className="text-xs text-muted-foreground">Desligada, some do mapa e o endereço deixa de abrir.</span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Lavanderia ativa" />
          </label>
        ) : null}
      </GlassCard>

      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin className="size-4 text-primary" aria-hidden /> Localização
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" name="address" defaultValue={store?.address ?? ""} className="h-11" placeholder="Rua, número, bairro" />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={store?.city ?? ""} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="state">UF</Label>
            <Input id="state" name="state" maxLength={2} defaultValue={store?.state ?? ""} className="h-11 uppercase" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Ponto no mapa</p>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={useMyLocation}>
              <LocateFixed className="size-3.5" /> Usar minha localização
            </Button>
          </div>
          <div className="h-64 overflow-hidden rounded-2xl border">
            <LocationPicker value={pos} onChange={setPos} />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {pos ? `Marcado em ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} · arraste o pino para ajustar` : "Clique no mapa para marcar onde fica a lavanderia."}
          </p>
        </div>
      </GlassCard>

      <GlassCard tone="strong" padding="lg" className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" aria-hidden /> Dono da lavanderia
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="owner_email">E-mail do dono</Label>
          <Input id="owner_email" name="owner_email" type="email" defaultValue={store?.owner_email ?? ""} className="h-11" placeholder="dono@lavanderia.com" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="owner_password">Senha provisória (opcional)</Label>
          <Input id="owner_password" name="owner_password" type="password" autoComplete="new-password" minLength={8} className="h-11" />
          <p className="text-xs text-muted-foreground">
            Com senha: o acesso é criado na hora (passe a senha ao dono). Sem senha: ele entra em /painel/entrar com o link
            por e-mail e vira dono automaticamente. Se o e-mail já tiver conta, ela é promovida a dono.
          </p>
        </div>
      </GlassCard>

      {!editing ? (
        <GlassCard tone="strong" padding="lg" className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <WashingMachine className="size-4 text-primary" aria-hidden /> Máquinas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="washers">Lavadoras</Label>
              <Input id="washers" name="washers" type="number" min={0} max={30} defaultValue={2} className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="washer_price">Preço lavagem (R$)</Label>
              <Input id="washer_price" name="washer_price" inputMode="decimal" defaultValue="18,00" className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dryers">Secadoras</Label>
              <Input id="dryers" name="dryers" type="number" min={0} max={30} defaultValue={2} className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dryer_price">Preço secagem (R$)</Label>
              <Input id="dryer_price" name="dryer_price" inputMode="decimal" defaultValue="16,00" className="h-11" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cria L1, L2… e S1, S2… com QR Codes próprios, além das respostas padrão da base de conhecimento (o dono revisa).
          </p>
        </GlassCard>
      ) : null}

      <div className="xl:col-span-2">
        <Button type="submit" disabled={pending || name.trim().length < 2} className="h-12 w-full text-base sm:w-auto sm:px-8">
          <Save className="size-4" /> {editing ? "Salvar alterações" : "Criar lavanderia"}
        </Button>
      </div>
    </form>
  );
}
