-- Donos com várias lavanderias + catálogo de problemas escolhido por lavanderia.

-- ───────────────────────────── Donos ↔ lojas (N:N) ─────────────────────────────
create table public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (store_id, profile_id)
);
create index on public.store_members (profile_id);
alter table public.store_members enable row level security;

-- profiles.store_id passa a ser a "loja ativa" do painel; o vínculo real é store_members.
insert into public.store_members (store_id, profile_id)
select store_id, id from public.profiles where role = 'owner' and store_id is not null
on conflict do nothing;

create or replace function public.is_store_owner(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
      or exists (select 1 from public.store_members m where m.profile_id = (select auth.uid()) and m.store_id = target_store);
$$;

create policy "members: o próprio vê" on public.store_members for select using ((select auth.uid()) = profile_id);
create policy "members: admin gerencia" on public.store_members for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Novo usuário cujo e-mail é owner_email de uma ou mais lojas vira dono de todas elas.
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
  if owner_store is not null then
    insert into public.store_members (store_id, profile_id)
    select id, new.id from public.stores where lower(owner_email) = lower(new.email)
    on conflict do nothing;
  else
    insert into public.loyalty_ledger (profile_id, store_id, points, reason)
    values (new.id, null, 50, 'Bônus de boas-vindas');
  end if;
  return new;
end;
$$;

-- ───────────────────────────── Catálogo de problemas ─────────────────────────────
-- builtin = da plataforma (com conferências automáticas); os demais são criados por donos.
-- visibility: private (só do dono) · pending (sugerido, aguardando o admin) · public (catálogo de todos).
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  chip text not null,
  icon text not null default 'MessageCircleQuestion',
  solution text not null,
  escalate_when text,
  priority text not null default 'normal' check (priority in ('normal', 'critical')),
  compensable boolean not null default false,
  needs_machine boolean not null default false,
  checks text[] not null default '{}',
  always_notify boolean not null default false,
  builtin boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'pending', 'public')),
  owner_id uuid references public.profiles (id) on delete set null,
  origin_store_id uuid references public.stores (id) on delete set null,
  sort smallint not null default 100,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index on public.problems (visibility);
create index on public.problems (owner_id);
alter table public.problems enable row level security;

create policy "problems: catálogo e os próprios" on public.problems for select
  using (visibility = 'public' or owner_id = (select auth.uid()) or public.is_platform_admin());
create policy "problems: dono cria os seus" on public.problems for insert to authenticated
  with check (owner_id = (select auth.uid()) and not builtin and visibility in ('private', 'pending'));
create policy "problems: dono edita os seus não aprovados" on public.problems for update
  using (owner_id = (select auth.uid()) and visibility in ('private', 'pending'))
  with check (owner_id = (select auth.uid()) and not builtin and visibility in ('private', 'pending'));
create policy "problems: admin gerencia" on public.problems for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Quais problemas valem em cada lavanderia (+ solução ajustada só para ela).
create table public.store_problems (
  store_id uuid not null references public.stores (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  custom_solution text,
  created_at timestamptz not null default now(),
  primary key (store_id, problem_id)
);
create index on public.store_problems (problem_id);
alter table public.store_problems enable row level security;
create policy "store_problems: dono da loja" on public.store_problems for all
  using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

-- Problemas da plataforma (gerados de src/domain/problems.ts).
insert into public.problems (slug, title, chip, icon, solution, escalate_when, priority, compensable, needs_machine, checks, sort)
values
  ('liberacao_demorada', 'Demora na liberação após o pagamento', 'Paguei e a máquina não liberou', 'Hourglass', 'Depois do pagamento aprovado, a liberação pode levar até 2 minutos. Aguarde o painel da máquina acender.
Confira se você pagou na máquina certa: o número aparece no comprovante da maquininha.
Se passou de 2 minutos, eu confiro o pagamento e o registro da máquina para você.', 'Pagamento aprovado e a máquina sem liberação há mais de 5 minutos.', 'normal', true, true, '{payment,machine_log,camera}', 1),
  ('erro_porta', 'Erro de travamento da porta', 'Erro na porta / não trava', 'DoorClosed', 'Abra a porta, confira se nenhuma peça de roupa ficou presa na borracha da vedação.
Feche a porta com firmeza até ouvir o clique.
Aperte iniciar novamente. Se o erro continuar, eu verifico o registro da máquina.', 'Erro de porta persistente após fechar corretamente.', 'normal', true, true, '{machine_log,camera}', 2),
  ('sem_sabao', 'Reclamação de ausência de sabão', 'A máquina não usou sabão', 'Droplets', 'O sabão e o amaciante são dosados automaticamente em etapas do ciclo; é normal não ver espuma no início.
Lavadoras de alta eficiência fazem pouca espuma de propósito.
Se ao final as roupas estiverem sem cheiro de limpeza, eu registro para o lojista verificar a dosagem.', 'Cliente confirma ao final do ciclo que não houve dosagem.', 'normal', false, true, '{machine_log,camera}', 3),
  ('maquininha_travada', 'Maquininha de pagamento travada', 'A maquininha travou', 'CreditCard', 'Segure o botão de ligar na lateral da maquininha por cerca de 10 segundos até ela desligar.
Aguarde 5 segundos e segure o mesmo botão de novo para ligar.
Espere a tela inicial aparecer (cerca de 1 minuto) e tente pagar outra vez.
Antes de pagar de novo, eu confiro se a primeira cobrança passou, para evitar cobrança em dobro.', 'A maquininha não volta após reiniciar ou trava várias vezes seguidas.', 'normal', false, false, '{payment}', 4),
  ('pelos_animais', 'Pelos de animais na máquina', 'Tem pelo de animal na máquina', 'PawPrint', 'Sentimos muito. A lavagem de itens de animais é proibida na loja.
Se puder, use outra máquina livre; eu indico qual.
Tire uma foto do tambor: eu registro e o lojista providencia a limpeza.', 'Sempre registrar para o lojista (higiene).', 'normal', false, true, '{camera}', 5),
  ('secagem_insuficiente', 'Secagem insuficiente', 'A roupa não secou', 'Wind', 'Use o cesto medidor: colocar mais roupa do que ele comporta impede o ar quente de circular.
Para roupas grossas (toalhas, jeans, edredom), escolha temperatura ALTA.
Se sobrar umidade, um ciclo extra curto costuma resolver.', 'Secadora sem aquecer (registro indica falha).', 'normal', false, true, '{machine_log}', 6),
  ('nao_iniciou', 'Cliente não iniciou o ciclo', 'Paguei mas não começou', 'PlayCircle', 'Depois de liberar, é preciso escolher o programa e apertar o botão INICIAR no painel da máquina.
Confira se a porta está bem fechada.
A liberação fica ativa por alguns minutos; se expirar, eu verifico para você.', 'Liberação expirou sem início.', 'normal', false, true, '{machine_log}', 7),
  ('roupa_esquecida', 'Roupas esquecidas na máquina', 'Tem roupa esquecida na máquina', 'Shirt', 'Se o ciclo já terminou, você pode retirar as roupas com cuidado e colocá-las na bancada.
Se as roupas são suas e a loja está fechando, venha antes do horário em que a porta tranca.
Eu aviso o dono da roupa quando ele tiver deixado o celular no atendimento.', 'Roupas presas com a loja perto de fechar.', 'normal', false, true, '{machine_log,camera}', 8),
  ('servico_errado', 'Pagamento do serviço errado (lavadora × secadora)', 'Paguei o serviço errado', 'ArrowLeftRight', 'Não inicie o ciclo pago por engano.
Eu confiro o pagamento e peço ao lojista para liberar o serviço correto.
Se houver outro cliente na loja, você pode oferecer o ciclo pago a ele.', 'Sempre: a troca precisa do lojista no Cicclo (sem cancelamento automático).', 'normal', true, true, '{payment,machine_log}', 9),
  ('sem_internet', 'Queda de internet na loja', 'Nada funciona / sem internet', 'WifiOff', 'Pode ser uma queda de internet da loja; as máquinas dependem dela para liberar.
Não faça novos pagamentos por enquanto.
Já avisei o lojista com prioridade.', 'Imediatamente (loja parada).', 'critical', false, false, '{payment,machine_log}', 10)
on conflict (slug) do nothing;

update public.problems set builtin = true, visibility = 'public', approved_at = now() where slug is not null;

-- Lojas existentes começam com todos os problemas da plataforma marcados.
insert into public.store_problems (store_id, problem_id)
select s.id, p.id from public.stores s cross join public.problems p where p.builtin
on conflict do nothing;
