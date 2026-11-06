# laundromat.ai · Atendente virtual da EasyWash (protótipo v1)

Atendente virtual para lavanderia self-service. O cliente abre pelo **QR Code** (sem baixar app nem criar conta), conversa por **texto ou voz**, e o atendente **confere os fatos** (pagamento, registro da máquina e câmera) antes de orientar, compensar ou chamar o lojista. O lojista tem um **painel** com casos prontos para decidir, compensações, máquinas ao vivo, relatórios e um **Simulador** para a demonstração.

> Protótipo para apresentação. Cicclo, Stone, câmeras e WhatsApp entram como **adaptadores simulados** (`INTEGRATIONS_MODE=mock`), alimentados pelo Simulador do painel.

## Stack

- **Next.js 16.4** (App Router, Server Actions, `proxy.ts`, React Compiler) rodando em **Cloudflare Workers** via OpenNext, **React 19.3**, TypeScript estrito
- **Tailwind CSS 4.3** + **shadcn/ui** + camada própria de **liquid glass** (tokens em `src/app/globals.css`), **Motion**, **lucide-react**
- **Supabase**: Postgres com RLS, Auth (Google, magic link, senha do lojista), Realtime, Storage
- **AI SDK 7** + **Claude** (`@ai-sdk/anthropic`) com tools tipadas (Zod 4). Sem chave, roda em **modo roteiro**
- **Voz** pela Web Speech API (pt-BR, sem custo) · **PWA** instalável com página offline e push
- Vitest (regras de negócio) · Playwright (e2e no celular)

## Como rodar

```bash
pnpm install
cp .env.example .env.local   # preencha Supabase (e, se quiser, ANTHROPIC_API_KEY)
```

1. **Banco**: com o Supabase CLI, `supabase link --project-ref <ref>` e depois `pnpm db:push` (aplica `supabase/migrations` e o `supabase/seed.sql` com dados de demonstração).
2. **Dono da loja**: `pnpm create-owner voce@email.com SenhaForte123` (marca o e-mail em `stores.owner_email` e cria o usuário com papel `owner`).
3. **Auth** (Supabase → Authentication): adicione `http://localhost:3000/auth/callback` e a URL de produção em *Redirect URLs*; para o Google, ative o provedor com o Client ID/Secret.
4. `pnpm dev` e abra http://localhost:3000 (cliente) e http://localhost:3000/painel (lojista).

As páginas são renderizadas sob demanda (dados sempre ao vivo do Supabase).

## Roteiro da demonstração

1. Painel → **Simulador**, escolha a **L1** e rode **Pagou e não liberou**.
2. No celular (ou outra aba), abra **/m/L1** (é o QR Code da máquina; imprima todos em Painel → Máquinas).
3. Informe nome e celular e diga "paguei e a máquina não liberou" (texto ou microfone).
4. O atendente mostra a **conferência dos fatos** (Stone, Cicclo e câmera) e propõe **liberar de novo**. Na fase 1, a proposta vai para o lojista. O código de SMS é simulado e aparece na tela.
5. Painel → **Casos**: o caso chega com resumo, provas e transcrição. **Aprovar** libera a máquina, e o cliente vê o resultado na hora.
6. Outros cenários: maquininha travada (passo a passo + registro), queda de internet (aviso **urgente** imediato), esqueceu de apertar INICIAR (orienta sem compensar), roupa esquecida, pelos de animal, serviço pago errado, ciclo terminando.
7. **Relatórios**: problemas mais comuns, quem resolveu, horários de pico, máquinas com mais ocorrências e travamentos da maquininha (inclui histórico `(demo)` do seed).

## Regras do piloto (no código, não no prompt)

- `src/domain/compensation.ts`: compensa só com a falha confirmada pelas conferências; na **fase 1** tudo passa pelo lojista; estorno sempre com o lojista; limites por caso, cliente e dia.
- `src/domain/notifications.ts`: urgentes vão na hora; os demais são agrupados às **8h, 11h, 13h, 18h e 20h** (configurável).
- `src/domain/store-hours.ts`: **6h às 23h**, aviso de fechamento e "o ciclo não termina antes de a porta trancar".
- `src/domain/problems.ts`: os 10 problemas relatados pelo lojista, com passos guiados e conferências exigidas.
- Máquinas livres só para quem tem conta, cada consulta registrada, sem imagens nem contagem de pessoas.

## Estrutura

```
src/app/(cliente)      PWA do cliente: início, ajuda, QR /m/[codigo], dúvidas, máquinas, conta
src/app/(chat)         tela cheia do atendimento /atendimento/[id]
src/app/painel         painel do lojista ((auth)/entrar e (app)/…)
src/app/api/chat       streaming do atendente (Claude + tools, ou modo roteiro)
src/domain             regras puras e testadas
src/server             serviços: atendimento, integrações (mock), simulador, painel
supabase/              migrations (schema + RLS + realtime) e seed
design-system/         design system gerado com a skill ui-ux-pro-max
```

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` (requer Supabase; instale o navegador com `pnpm exec playwright install chromium`) · `pnpm db:push` · `pnpm db:types`

## Próximos passos

- Integração real com o Cicclo (API ou acesso autorizado: pagamentos, estado, liberação, cancelamento antes do início) e com a Stone.
- Câmeras Intelbras: envio de foto a cada 30 s, análise com rostos borrados (e câmeras mais próximas das máquinas, como o lojista sugeriu).
- WhatsApp Cloud API para os avisos ao lojista; SMS real para o código de confirmação.
- Revisão jurídica (LGPD, cartaz da loja, prazo de guarda das imagens).

## Deploy no Cloudflare (Workers + OpenNext)

O app roda em Cloudflare Workers com o adaptador [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (`wrangler.jsonc`, `open-next.config.ts`).

> `cacheComponents`/`partialPrefetching` estão desligados no `next.config.ts`: no Workers eles ainda travam as páginas ([opennextjs-cloudflare#1450](https://github.com/opennextjs/opennextjs-cloudflare/issues/1450)). Religue quando houver suporte.

**Variáveis**
- **No build** (embutidas no bundle): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Segredos do Worker** (em tempo de execução): `SUPABASE_SERVICE_ROLE_KEY` e, opcional, `ANTHROPIC_API_KEY`.
- **Variáveis públicas**: já estão em `wrangler.jsonc` (`vars`).

**Opção A, deploy automático pelo GitHub (recomendado)**: Cloudflare → *Workers & Pages* → *Create* → *Import a repository* → escolha este repositório (branch `main`).
1. Build command: `pnpm exec opennextjs-cloudflare build`. Deploy command: `pnpm exec opennextjs-cloudflare deploy`.
2. Em *Settings → Build → Variables*, adicione as duas `NEXT_PUBLIC_*`.
3. Em *Settings → Variables and Secrets*, adicione os segredos.
4. Cada push na `main` publica sozinho, e o build roda em Linux (evita as limitações do OpenNext no Windows).

**Opção B, pela máquina**:

```bash
pnpm exec wrangler login        # com a conta Cloudflare certa (confira com: pnpm exec wrangler whoami)
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm cf:deploy
```

No Windows, o build do OpenNext usa `nodeLinker: hoisted` (em `pnpm-workspace.yaml`) para não depender de symlinks. Para testar localmente no runtime do Workers, rode `pnpm cf:preview` (lê os segredos de `.dev.vars`).

**Depois do primeiro deploy**: em Supabase → Authentication → URL Configuration, coloque a URL `*.workers.dev` (ou o domínio próprio) em *Site URL* e adicione `https://SEU-DOMINIO/auth/callback` em *Redirect URLs*.
