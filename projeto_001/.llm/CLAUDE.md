# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual

Projeto **DevQuiz Arena** (nome provisório): quiz competitivo em tempo real, de uso interno, sobre IA, ferramentas de workflow e programação. O PRD em `.llm/prd.md` é a **fonte de verdade**. Leia o PRD antes de cada marco e trabalhe **um marco por vez** (M0 → M8, seção 15 do PRD). Cada marco termina com testes passando e uma demo funcional.

**M0 (fundação) e M1 (game engine) concluídos.** Apps web e realtime ainda são placeholders (`/health`, home). Decisões já tomadas: Supabase **cloud** (o compose não inclui a stack do Supabase) e CI na raiz do repositório git.

`../projeto_000` é **somente leitura**: nunca edite, formate, mova ou commite nada nele.

Este diretório faz parte do repositório de estudo `TrilhaClaudeCODE` (raiz em `..`); `../projeto_000` é um projeto anterior e independente (jogo da cobrinha).

## Comandos

pnpm 12 via corepack (`packageManager` no `package.json`), Node 22. Tudo roda na raiz do `projeto_001`:

```bash
pnpm install
pnpm dev                 # web em :3000 (Next) + realtime em :4000 (tsx watch)
pnpm lint | pnpm typecheck | pnpm test | pnpm build | pnpm format[:check]
pnpm --filter @devquiz/game-engine test -- src/x.test.ts -t "nome do teste"   # um teste só
pnpm db:start | db:stop | db:types   # Supabase local via CLI (devDependency, sem instalação global)
pnpm docker:up | docker:down | docker:logs   # stack web + realtime + caddy em https://localhost
```

- Um único `.env` na **raiz** (modelo em `.env.example`) serve para tudo: o realtime o carrega via `--env-file-if-exists`, a web via `loadEnvConfig` no `next.config.ts` e o compose via `--env-file .env` (por isso use os scripts `docker:*`, não `docker compose` direto).
- A porta do realtime é `REALTIME_PORT`, não `PORT`: o `PORT` do `.env` compartilhado sequestraria a porta do Next.
- `NEXT_PUBLIC_*` são fixadas no build da imagem web (build args no compose).
- pnpm 12 só roda scripts de install das dependências em `allowBuilds` no `pnpm-workspace.yaml`.
- CI: `../.github/workflows/projeto_001.yml` (raiz do repositório git) roda format, lint, typecheck, test, build e o build das imagens Docker.

## Arquitetura

Os pacotes `@devquiz/shared` e `@devquiz/game-engine` exportam **TS-fonte** (`exports: ./src/index.ts`), sem build próprio: a web os transpila (`transpilePackages`) e o realtime os embute no bundle (tsup, `noExternal: /^@devquiz\//`). A web usa **Next 16** com Cache Components; leia `apps/web/AGENTS.md` e as docs em `node_modules/next/dist/docs/` antes de mexer no Next (um `GET` em route handler é pré-renderizado, a menos que chame `connection()` ou use dados de request). O Caddy manda `/socket.io/*`, `/api/solo/*`, `/api/me/*`, `/api/questions/*` e `/health` para o realtime; o resto vai para a web.

```
apps/web            Next.js (App Router) + Tailwind + shadcn/ui: login, host, jogador, telão, solo
apps/realtime       Node.js + Socket.IO (sala ao vivo) + API HTTP do modo solo
packages/shared     Tipos, schemas Zod e contrato de eventos/API (seção 13 do PRD)
packages/game-engine  Regras puras: máquinas de estado, pontuação, streak, times, desempate, badges
supabase/migrations SQL do schema + RLS;  supabase/seed: seed com ~60 perguntas
infra/              docker-compose.yml e Caddyfile
```

Fluxo central: o front autentica via Supabase Auth (GitHub/Google) → envia o `access_token` no handshake do Socket.IO (`auth: { token }`) ou nas rotas da API → `apps/realtime` valida o JWT, lê as perguntas com a service role key, conduz a partida usando `game-engine` e grava só o resultado final em `matches`/`match_players`.

- **Estado das salas em memória**, em uma única instância (até 20 jogadores por sala, cerca de 10 salas). Fica atrás de uma interface `RoomStore`, para que trocar por Redis no futuro seja simples. Perder partidas em andamento num restart é aceitável no MVP.
- **Sala ao vivo**: `LOBBY → COUNTDOWN → QUESTION_OPEN → QUESTION_CLOSED → REVEAL → LEADERBOARD →` (loop) `→ PODIUM → FINISHED`; qualquer estado pode ir para `PAUSED` e voltar ao anterior.
- **Modo solo**: `CONFIG → QUESTION → FEEDBACK → … → SUMMARY`, servido pela API HTTP (sem socket), usando a mesma engine.

### game-engine (M1)

As duas máquinas de estado são **reducers puros**: `liveReducer(state, event)` e `soloReducer(state, event)` devolvem `{ ok: true, state }` ou `{ ok: false, error }` com um código tipado (ex.: `DEADLINE_PASSED`, `ALREADY_ANSWERED`); nunca lançam erro por evento inválido. A engine **não lê relógio**: todo evento que depende de tempo traz `now` (ms), e o servidor passa o horário dele. É assim que o tempo de resposta fica medido no servidor. O servidor (M4/M7) decide quando disparar cada evento, por exemplo `CLOSE_QUESTION` no fim do timer ou quando `haveAllAnswered(state)` for verdadeiro.

- `EngineQuestion` carrega `correct`, então o estado da engine **nunca** vai inteiro para o cliente; os payloads públicos (sem resposta) são montados no realtime.
- Pontuação em `scoring.ts`, estatísticas em `player.ts`, desempate em `ranking.ts`, times em `teams.ts`, pódio e badges em `results.ts`. Os esclarecimentos de regra estão na seção 7 do PRD.
- O teste da engine roda com cobertura (`vitest run --coverage`) e falha abaixo de 95% de linhas e 90% de branches.

## Regras invariantes

- Regras de jogo e pontuação só em `packages/game-engine`, como **funções puras**. Nunca no front nem nos handlers de socket/API.
- Contratos de eventos e de API vivem em `packages/shared` (Zod). Mudou o contrato → atualize a seção 13 do PRD.
- A resposta correta **nunca** chega ao cliente antes de `question:reveal` (ou da resposta na API solo). Isso deve ser garantido por testes automatizados nos dois caminhos.
- O tempo de resposta é medido **no servidor** (do envio da pergunta até o recebimento da resposta).
- A tabela `questions` fica sem acesso para `anon`/`authenticated` (RLS). Só o servidor lê, com a **secret key** (`SUPABASE_SECRET_KEY`, `sb_secret_…`, o que o PRD chama de service role key), que existe apenas em `apps/realtime` e no código server-side, nunca no bundle client. No navegador vai só a publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). O JWT é validado pelas chaves públicas em `SUPABASE_JWKS_URL`.
- Schema muda só por migração em `supabase/migrations`.
- O sistema **não executa código**: perguntas `code_output` são estáticas.
- Pontuação (seção 7): acerto = `round(1000 * (1 - (t/t_limite)/2))`; streak ≥3 dá `+100 * min(streak-2, 5)`; multiplicador de dificuldade 1x/1,25x/1,5x; `multi_select` proporcional com mínimo 0; time = **média** dos membros; desempate por mais acertos e, depois, menor tempo médio.
- Conteúdo e UI em `pt-BR`. Commits pequenos e convencionais (`feat:`, `fix:`, `test:`, `chore:`).
