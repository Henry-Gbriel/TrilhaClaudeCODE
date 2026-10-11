# DevQuiz Arena

Quiz competitivo em tempo real sobre IA, ferramentas de workflow e programação, para uso interno de times. Requisitos completos em [`.llm/prd.md`](.llm/prd.md).

> Status: **M0 (fundação)** concluído. Apps e pacotes têm só a estrutura base; as regras de jogo começam no M1.

## Stack

Monorepo **pnpm** com TypeScript estrito:

| Pasta                  | O que é                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `apps/web`             | Next.js 16 (App Router) + Tailwind + shadcn/ui             |
| `apps/realtime`        | Fastify + Socket.IO (sala ao vivo) e API HTTP do modo solo |
| `packages/shared`      | Tipos e schemas Zod do contrato de eventos e API           |
| `packages/game-engine` | Regras de jogo como funções puras                          |
| `supabase/`            | Config do Supabase CLI, migrações e seed                   |
| `infra/`               | `docker-compose.yml` (web, realtime, caddy) e `Caddyfile`  |

## Pré-requisitos

- Node 22 (`.nvmrc`) e corepack (`corepack enable` instala o pnpm da versão certa)
- Docker com Compose, para a stack completa
- Um projeto no [Supabase](https://supabase.com) (cloud)

## Setup

```bash
pnpm install
cp .env.example .env   # preencha com os valores de Project Settings → API Keys
```

A `SUPABASE_SECRET_KEY` ignora o RLS: ela fica só no `.env` (que o git ignora) e só o servidor a usa.

Para usar o Supabase CLI (migrações e tipos), rode uma vez em um terminal interativo:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
```

## Desenvolvimento

```bash
pnpm dev          # web em http://localhost:3000 e realtime em http://localhost:4000
pnpm test         # todos os testes (Vitest)
pnpm --filter @devquiz/game-engine test -- src/x.test.ts -t "nome"   # um teste só
pnpm lint
pnpm typecheck
pnpm format
pnpm build
```

## Stack completa com Docker

```bash
pnpm docker:up     # build + sobe web, realtime e caddy em https://localhost
pnpm docker:logs
pnpm docker:down
```

Use os scripts `docker:*` em vez de `docker compose` direto: eles passam o `.env` da raiz para o compose. As variáveis `NEXT_PUBLIC_*` são fixadas no build da imagem da web. Em produção, defina `SITE_ADDRESS` com o domínio, e o Caddy emite o certificado HTTPS.

## CI

O workflow `.github/workflows/projeto_001.yml`, na raiz do repositório, roda formatação, lint, typecheck, testes, build e o build das imagens Docker a cada push ou PR que toque em `projeto_001/`.
