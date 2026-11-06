-- Multi-lavanderia: localização das lojas, admin da plataforma e pontos globais do cliente.

-- ───────────────────────────── Lojas ─────────────────────────────
alter table public.stores
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists description text,
  add column if not exists brand_color text,
  add column if not exists active boolean not null default true;

alter table public.stores
  add constraint stores_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create index if not exists stores_active_idx on public.stores (active);

-- ───────────────────────────── Papéis ─────────────────────────────
-- admin = dono da plataforma (cadastra lavanderias e convida donos).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'owner', 'customer'));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

-- Admin enxerga e gerencia tudo; dono continua restrito à própria loja.
create or replace function public.is_store_owner(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'admin' or (p.role = 'owner' and p.store_id = target_store))
  );
$$;

create policy "stores: admin cria" on public.stores for insert with check (public.is_platform_admin());
create policy "stores: admin remove" on public.stores for delete using (public.is_platform_admin());

-- Leitura pública só das lojas ativas (o admin vê todas).
drop policy if exists "stores: leitura pública" on public.stores;
create policy "stores: leitura pública" on public.stores for select using (active or public.is_store_owner(id));

-- O cliente não pode se promover: impede mudar role/store_id pelo próprio perfil.
drop policy if exists "profiles: o próprio atualiza" on public.profiles;
create policy "profiles: o próprio atualiza" on public.profiles for update
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    and store_id is not distinct from (select p.store_id from public.profiles p where p.id = (select auth.uid()))
  );

-- ───────────────────────────── Clientes e pontos ─────────────────────────────
-- Conta do cliente é da plataforma (vale em qualquer lavanderia); pontos de boas-vindas sem loja.
alter table public.loyalty_ledger alter column store_id drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_store uuid;
begin
  select id into owner_store from public.stores where lower(owner_email) = lower(new.email) order by created_at limit 1;
  insert into public.profiles (id, store_id, role, full_name, phone)
  values (
    new.id,
    owner_store,
    case when owner_store is not null then 'owner' else 'customer' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do nothing;
  if owner_store is null then
    insert into public.loyalty_ledger (profile_id, store_id, points, reason)
    values (new.id, null, 50, 'Bônus de boas-vindas');
  end if;
  return new;
end;
$$;

-- ───────────────────────────── Dados da EasyWash ─────────────────────────────
update public.stores
set city = 'Novo Hamburgo', state = 'RS', lat = -29.6788, lng = -51.1306,
    description = 'Lavanderia self-service · 4 máquinas Speed Queen'
where slug = 'easywash' and lat is null;
