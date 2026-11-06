-- Seed do piloto EasyWash. Dados de equipamentos a confirmar com o lojista.
-- Valores marcados "(demo)" são fictícios, só para a demonstração.

insert into public.stores (id, slug, name, address, city, state, lat, lng, description, open_time, close_time, owner_whatsapp, owner_email)
values (
  '00000000-0000-4000-8000-000000000001',
  'easywash',
  'EasyWash',
  null,
  'Novo Hamburgo',
  'RS',
  -29.6788,
  -51.1306,
  'Lavanderia self-service · 4 máquinas Speed Queen',
  '06:00',
  '23:00',
  null,
  null -- defina com: pnpm create-owner voce@email.com SuaSenha
)
on conflict (id) do nothing;

-- Máquinas (hipótese: 2 lavadoras + 2 secadoras; ajuste no painel).
insert into public.machines (store_id, code, kind, label, brand, model, capacity_kg, price_cents, cycle_minutes, sort)
values
  ('00000000-0000-4000-8000-000000000001', 'L1', 'washer', 'Lavadora 1', 'Speed Queen', 'SSG030', 14, 1800, 35, 1),
  ('00000000-0000-4000-8000-000000000001', 'L2', 'washer', 'Lavadora 2', 'Speed Queen', 'SSG030', 14, 1800, 35, 2),
  ('00000000-0000-4000-8000-000000000001', 'S1', 'dryer', 'Secadora 1', 'Speed Queen', 'LTEE5ASP179TW01 (Stack)', 10, 1600, 45, 3),
  ('00000000-0000-4000-8000-000000000001', 'S2', 'dryer', 'Secadora 2', 'Speed Queen', 'LTEE5ASP179TW01 (Stack)', 10, 1600, 45, 4)
on conflict (store_id, code) do nothing;

insert into public.payment_terminals (store_id, provider, model)
select '00000000-0000-4000-8000-000000000001', 'Stone', 'SUNMI P2-B'
where not exists (select 1 from public.payment_terminals where store_id = '00000000-0000-4000-8000-000000000001');

-- Base de conhecimento (das respostas do lojista; revisar antes de abrir ao público).
insert into public.kb_articles (store_id, category, question, answer, tags, sort) values
  ('00000000-0000-4000-8000-000000000001', 'Uso das máquinas', 'Como usar a lavadora?',
   '1) Coloque as roupas sem passar da linha do cesto medidor. 2) Pague na maquininha escolhendo o número da máquina. 3) Aguarde o painel acender (até 2 minutos). 4) Escolha o programa e aperte INICIAR. O sabão e o amaciante são colocados automaticamente.',
   '{lavadora,uso,iniciar}', 1),
  ('00000000-0000-4000-8000-000000000001', 'Uso das máquinas', 'Como usar a secadora?',
   'Use o cesto medidor: secadora cheia demais não seca. Para toalhas, jeans e edredons escolha temperatura ALTA; para roupas delicadas, MÉDIA ou BAIXA. Pague, aguarde liberar e aperte INICIAR.',
   '{secadora,temperatura,cesto}', 2),
  ('00000000-0000-4000-8000-000000000001', 'Pagamento', 'Paguei e a máquina não liberou. E agora?',
   'A liberação pode levar até 2 minutos depois do pagamento aprovado. Confira se pagou na máquina certa (o número aparece no comprovante). Passou disso? Abra o atendimento que eu confiro o pagamento e o registro da máquina.',
   '{pagamento,liberacao}', 3),
  ('00000000-0000-4000-8000-000000000001', 'Pagamento', 'A maquininha travou. Como reiniciar?',
   'Segure o botão de ligar na lateral por cerca de 10 segundos até desligar, espere 5 segundos e ligue de novo. Aguarde a tela inicial (cerca de 1 minuto). Antes de pagar de novo, confira comigo se a primeira cobrança passou.',
   '{maquininha,stone,reiniciar}', 4),
  ('00000000-0000-4000-8000-000000000001', 'Pagamento', 'Paguei a máquina errada (lavadora × secadora).',
   'Não inicie o ciclo pago por engano. Abra o atendimento: eu confiro o pagamento e peço ao lojista para liberar o serviço correto. Se houver outro cliente na loja, você pode oferecer o ciclo a ele.',
   '{pagamento,erro,troca}', 5),
  ('00000000-0000-4000-8000-000000000001', 'Regras da loja', 'Posso lavar itens de animais?',
   'Não. A lavagem de caminhas, mantas e outros itens usados por animais é proibida, para proteger a saúde de todos os clientes. Encontrou pelos na máquina? Avise no atendimento e use outra máquina livre.',
   '{pets,regras,higiene}', 6),
  ('00000000-0000-4000-8000-000000000001', 'Regras da loja', 'Qual o horário de funcionamento?',
   'Abrimos todos os dias das 6h às 23h. A porta tranca e destranca sozinha: retire suas roupas antes das 23h, senão elas ficam presas até a abertura.',
   '{horario,porta}', 7),
  ('00000000-0000-4000-8000-000000000001', 'Problemas comuns', 'A máquina não usou sabão?',
   'A dosagem é automática e acontece em etapas do ciclo; máquinas de alta eficiência fazem pouca espuma de propósito. Se ao final as roupas estiverem sem cheiro de limpeza, avise no atendimento para o lojista verificar.',
   '{sabao,dosagem}', 8),
  ('00000000-0000-4000-8000-000000000001', 'Problemas comuns', 'A porta dá erro e não trava.',
   'Abra a porta, confira se nenhuma peça ficou presa na borracha, feche com firmeza até ouvir o clique e aperte INICIAR. Se continuar, abra o atendimento.',
   '{porta,erro}', 9),
  ('00000000-0000-4000-8000-000000000001', 'Problemas comuns', 'Encontrei roupas esquecidas na máquina.',
   'Se o ciclo terminou, retire as roupas com cuidado e deixe na bancada. Se as roupas forem suas, volte antes das 23h.',
   '{roupa,esquecida}', 10);

-- ───── Histórico de demonstração (últimos 30 dias) para os relatórios (demo) ─────
do $$
declare
  s uuid := '00000000-0000-4000-8000-000000000001';
  m uuid[];
  types text[] := array['liberacao_demorada','erro_porta','sem_sabao','maquininha_travada','pelos_animais','secagem_insuficiente','nao_iniciou','roupa_esquecida','servico_errado','duvida'];
  weights int[] := array[6,4,2,5,2,3,4,3,2,9];
  i int; t text; d timestamptz; conv uuid; mid uuid; by_ai boolean; pick int; acc int; r int;
begin
  select array_agg(id order by sort) into m from public.machines where store_id = s;
  for i in 1..64 loop
    -- escolha ponderada do tipo
    r := floor(random() * 40)::int; acc := 0; pick := 1;
    for j in 1..array_length(weights, 1) loop
      acc := acc + weights[j];
      if r < acc then pick := j; exit; end if;
    end loop;
    t := types[pick];
    d := now() - (floor(random() * 30) || ' days')::interval
         - (floor(random() * 15) || ' hours')::interval - (floor(random() * 60) || ' minutes')::interval;
    -- concentra no pico (fim de tarde / noite)
    d := date_trunc('day', d) + make_interval(hours => (array[7,9,10,12,17,18,18,19,19,20,20,21])[1 + floor(random()*12)::int], mins => floor(random()*59)::int);
    if d > now() - interval '1 hour' then d := d - interval '1 day'; end if;
    mid := case when t in ('maquininha_travada','duvida') then null else m[1 + floor(random() * 4)::int] end;
    by_ai := random() < 0.74;
    insert into public.conversations (store_id, visitor_name, machine_id, problem_type, status, resolved_by, summary, created_at, resolved_at)
    values (s, (array['Ana','Bruno','Carla','Diego','Elisa','Fábio','Gabi','Henrique','Isa','João'])[1 + floor(random()*10)::int],
            mid, t, 'resolved', case when by_ai then 'assistant' else 'owner' end, '(demo) atendimento histórico', d,
            d + make_interval(mins => case when by_ai then 1 + floor(random()*6)::int else 20 + floor(random()*200)::int end))
    returning id into conv;
    if not by_ai and t <> 'duvida' then
      insert into public.cases (store_id, conversation_id, machine_id, problem_type, status, title, summary, created_at, resolved_at, notify_at, notified_at, resolution)
      values (s, conv, mid, t, 'resolved', '(demo) caso histórico', '(demo) caso resolvido pelo lojista', d, d + interval '2 hours', d, d, 'Resolvido pelo lojista');
    end if;
    if t = 'maquininha_travada' then
      insert into public.incidents (store_id, kind, started_at, ended_at, notes) values (s, 'terminal_frozen', d, d + interval '4 minutes', '(demo)');
    elsif t = 'erro_porta' then
      insert into public.incidents (store_id, kind, machine_id, started_at, ended_at, notes) values (s, 'door_error', mid, d, d + interval '6 minutes', '(demo)');
    elsif t = 'liberacao_demorada' then
      insert into public.incidents (store_id, kind, machine_id, started_at, ended_at, notes) values (s, 'release_delay', mid, d, d + interval '3 minutes', '(demo)');
    end if;
  end loop;

  -- pagamentos de demonstração (movimento diário)
  insert into public.payments (store_id, machine_id, amount_cents, method, status, card_last4, created_at)
  select * from (select s, m[1 + floor(random() * 4)::int], (array[1800,1600])[1 + floor(random()*2)::int],
         (array['credito','debito','pix'])[1 + floor(random()*3)::int], 'approved',
         lpad(floor(random()*9999)::text, 4, '0'),
         date_trunc('day', now() - (g % 30 || ' days')::interval) + make_interval(hours => 6 + floor(random()*17)::int, mins => floor(random()*59)::int)
  from generate_series(1, 360) g) p(store_id, machine_id, amount_cents, method, status, card_last4, created_at)
  where p.created_at < now() - interval '1 hour'; -- nunca no futuro nem recente (não confunde as conferências)

  insert into public.compensations (store_id, kind, amount_cents, status, decision, decision_reasons, verification, created_at, decided_at)
  select s, 'reliberacao', 1800, 'executed', 'needs_owner', '{"(demo)"}',
         '{"payment":"confirmed","machine_log":"confirmed","camera":"confirmed"}', now() - (g * 4 || ' days')::interval, now() - (g * 4 || ' days')::interval
  from generate_series(1, 6) g;
end $$;
