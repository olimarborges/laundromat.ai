-- laundromat.ai — schema inicial do piloto (EasyWash)
-- Multi-loja desde o início: toda tabela operacional tem store_id.

create extension if not exists pgcrypto;

-- ───────────────────────────── Lojas e pessoas ─────────────────────────────

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  address text,
  timezone text not null default 'America/Sao_Paulo',
  open_time time not null default '06:00',
  close_time time not null default '23:00',
  owner_whatsapp text,
  owner_email text,
  pilot_phase smallint not null default 1 check (pilot_phase in (1, 2)),
  notify_hours smallint[] not null default '{8,11,13,18,20}',
  policy jsonb not null default '{"maxPerCaseCents":2000,"maxPerCustomerPerDayCents":2000,"maxPerStorePerDayCents":6000}',
  internet_status text not null default 'online' check (internet_status in ('online', 'offline')),
  internet_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  role text not null default 'customer' check (role in ('owner', 'customer')),
  full_name text,
  phone text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Equipamentos ─────────────────────────────

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code text not null,
  kind text not null check (kind in ('washer', 'dryer')),
  label text not null,
  brand text,
  model text,
  capacity_kg numeric(5, 1),
  price_cents integer not null default 1800,
  cycle_minutes integer not null default 40,
  status text not null default 'free' check (status in ('free', 'released', 'running', 'finished', 'error', 'offline')),
  released_at timestamptz,
  cycle_started_at timestamptz,
  cycle_ends_at timestamptz,
  last_error text,
  sort smallint not null default 0,
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);

create table public.payment_terminals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null default 'ok' check (status in ('ok', 'frozen', 'offline')),
  updated_at timestamptz not null default now()
);

-- Simulação do que viria da Stone (pagamentos) e do Cicclo (registro das máquinas).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  machine_id uuid references public.machines (id) on delete set null,
  terminal_id uuid references public.payment_terminals (id) on delete set null,
  amount_cents integer not null,
  method text not null default 'credito' check (method in ('credito', 'debito', 'pix')),
  status text not null default 'approved' check (status in ('approved', 'declined', 'pending')),
  card_last4 text,
  created_at timestamptz not null default now()
);

create table public.machine_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  machine_id uuid references public.machines (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.camera_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  machine_id uuid references public.machines (id) on delete cascade,
  taken_at timestamptz not null default now(),
  observation text not null,
  analysis jsonb not null default '{}',
  image_url text
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  kind text not null check (kind in ('terminal_frozen', 'internet_down', 'machine_error', 'door_error', 'release_delay', 'forgotten_clothes', 'hygiene')),
  machine_id uuid references public.machines (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

-- ───────────────────────────── Atendimento ─────────────────────────────

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  visitor_token uuid not null default gen_random_uuid(),
  visitor_name text,
  visitor_phone text,
  phone_verified boolean not null default false,
  machine_id uuid references public.machines (id) on delete set null,
  problem_type text,
  status text not null default 'open' check (status in ('open', 'escalated', 'resolved', 'abandoned')),
  resolved_by text check (resolved_by in ('assistant', 'owner')),
  mode text not null default 'ai' check (mode in ('ai', 'script')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.messages (
  id text primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null,
  seq bigint generated always as identity,
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  machine_id uuid references public.machines (id) on delete set null,
  problem_type text not null,
  priority text not null default 'normal' check (priority in ('critical', 'normal')),
  status text not null default 'open' check (status in ('open', 'waiting_owner', 'resolved', 'dismissed')),
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}',
  actions_taken text[] not null default '{}',
  needs_physical boolean not null default false,
  notify_at timestamptz not null default now(),
  notified_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.compensations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  kind text not null check (kind in ('reliberacao', 'credito', 'estorno')),
  amount_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'executed')),
  decision text not null check (decision in ('auto_approve', 'needs_owner', 'deny')),
  decision_reasons text[] not null default '{}',
  verification jsonb not null default '{}',
  otp_code text,
  otp_verified boolean not null default false,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  owner_note text,
  created_at timestamptz not null default now()
);

create table public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  priority text not null default 'normal' check (priority in ('critical', 'normal')),
  title text not null,
  body text not null,
  deliver_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category text not null,
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  needs_review boolean not null default true,
  active boolean not null default true,
  sort smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Conta do cliente ─────────────────────────────

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.machine_status_views (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  visitor_token uuid,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Índices ─────────────────────────────

create index on public.machines (store_id, sort);
create index on public.payments (store_id, created_at desc);
create index on public.payments (machine_id, created_at desc);
create index on public.machine_events (machine_id, created_at desc);
create index on public.camera_snapshots (machine_id, taken_at desc);
create index on public.conversations (store_id, created_at desc);
create index on public.conversations (customer_id);
create index on public.messages (conversation_id, seq);
create index on public.cases (store_id, status, created_at desc);
create index on public.compensations (store_id, status);
create index on public.owner_notifications (store_id, deliver_at desc);
create index on public.incidents (store_id, started_at desc);
create index on public.kb_articles (store_id, active, sort);

-- ───────────────────────────── Funções auxiliares ─────────────────────────────

create or replace function public.is_store_owner(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'owner' and p.store_id = target_store
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger machines_touch before update on public.machines
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
create trigger kb_touch before update on public.kb_articles
  for each row execute function public.touch_updated_at();

-- Novo usuário → perfil de cliente na loja padrão; vira dono se o e-mail for o owner_email da loja.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_store uuid;
  default_store uuid;
begin
  select id into owner_store from public.stores where lower(owner_email) = lower(new.email) limit 1;
  select id into default_store from public.stores order by created_at limit 1;
  insert into public.profiles (id, store_id, role, full_name, phone)
  values (
    new.id,
    coalesce(owner_store, default_store),
    case when owner_store is not null then 'owner' else 'customer' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do nothing;
  if owner_store is null and default_store is not null then
    insert into public.loyalty_ledger (profile_id, store_id, points, reason)
    values (new.id, default_store, 50, 'Bônus de boas-vindas');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pontos: mantém profiles.points sincronizado com o extrato.
create or replace function public.apply_loyalty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set points = points + new.points where id = new.profile_id;
  return new;
end;
$$;

create trigger loyalty_apply after insert on public.loyalty_ledger
  for each row execute function public.apply_loyalty();

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.payment_terminals enable row level security;
alter table public.payments enable row level security;
alter table public.machine_events enable row level security;
alter table public.camera_snapshots enable row level security;
alter table public.incidents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.cases enable row level security;
alter table public.compensations enable row level security;
alter table public.owner_notifications enable row level security;
alter table public.kb_articles enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.machine_status_views enable row level security;
alter table public.push_subscriptions enable row level security;

-- Loja: dados públicos básicos (nome, horário) para a página inicial.
create policy "stores: leitura pública" on public.stores for select using (true);
create policy "stores: dono atualiza" on public.stores for update
  using (public.is_store_owner(id)) with check (public.is_store_owner(id));

-- Perfis
create policy "profiles: o próprio" on public.profiles for select using ((select auth.uid()) = id);
create policy "profiles: dono vê clientes da loja" on public.profiles for select using (public.is_store_owner(store_id));
create policy "profiles: o próprio atualiza" on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

-- Máquinas: só quem tem conta vê o estado (decisão 4 da proposta).
create policy "machines: clientes com conta" on public.machines for select to authenticated using (true);
create policy "machines: dono gerencia" on public.machines for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- Base de conhecimento: leitura pública dos artigos ativos.
create policy "kb: leitura pública" on public.kb_articles for select using (active);
create policy "kb: dono gerencia" on public.kb_articles for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- Tabelas operacionais: só o dono da loja.
create policy "terminals: dono" on public.payment_terminals for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "payments: dono" on public.payments for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "machine_events: dono" on public.machine_events for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "camera: dono" on public.camera_snapshots for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "incidents: dono" on public.incidents for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "cases: dono" on public.cases for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "compensations: dono" on public.compensations for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "notifications: dono" on public.owner_notifications for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- Conversas: o cliente logado vê as dele; o dono vê as da loja.
-- Visitantes sem conta acessam pelo servidor (service role + cookie de visitante).
create policy "conversations: cliente" on public.conversations for select using ((select auth.uid()) = customer_id);
create policy "conversations: dono" on public.conversations for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "messages: cliente" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and c.customer_id = (select auth.uid()))
);
create policy "messages: dono" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and public.is_store_owner(c.store_id))
);

-- Conta do cliente
create policy "loyalty: o próprio" on public.loyalty_ledger for select using ((select auth.uid()) = profile_id);
create policy "loyalty: dono" on public.loyalty_ledger for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "views: registra a própria" on public.machine_status_views for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy "views: o próprio" on public.machine_status_views for select using ((select auth.uid()) = profile_id);
create policy "views: dono audita" on public.machine_status_views for select using (public.is_store_owner(store_id));
create policy "push: o próprio" on public.push_subscriptions for all
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

-- ───────────────────────────── Realtime ─────────────────────────────

alter publication supabase_realtime add table
  public.machines,
  public.payment_terminals,
  public.stores,
  public.cases,
  public.compensations,
  public.conversations,
  public.owner_notifications;

-- ───────────────────────────── Storage ─────────────────────────────

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;
