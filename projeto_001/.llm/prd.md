# PRD — DevQuiz Arena (nome provisório)

> Quiz web competitivo e em tempo real sobre **IA**, **ferramentas de workflow** e **programação**, para **uso interno de times**.
> Este documento é a fonte de verdade para o desenvolvimento conjunto com o Claude Code.

**Versão:** 0.2 — 10/10/2026 (decisões estruturais definidas, ver seção 2)

---

## 1. Visão

Um "Kahoot para devs" de uso interno. Alguém cria uma sala e compartilha um PIN ou QR code, e os colegas entram com login GitHub/Google em um clique. Todos competem em rodadas rápidas, sozinhos ou em times. Quem quiser praticar sem sala ao vivo usa o modo treino solo.

**Princípios**
- **Entrar rápido**: login social em um clique, sessão lembrada; depois disso, só o PIN.
- **Intuitivo**: uma ação por tela, botões grandes, funciona bem no celular.
- **Competitivo, mas justo**: pontuação por acerto e velocidade, com streak e ranking ao vivo, e tempo medido no servidor.
- **Conteúdo técnico de verdade**: cada pergunta tem explicação, para aprender jogando.
- **Simples de operar**: tudo sobe com `docker compose up` em uma VM.

## 2. Decisões estruturais (fechadas)

| Tema | Decisão | Impacto |
|---|---|---|
| Público | **Uso interno** (time/empresa) | Sem moderação pública, sem anti-abuso pesado |
| Back-end realtime | **Node.js + Socket.IO** (TypeScript) | Tipos compartilhados com o front |
| Escala | **Até 20 jogadores por sala** | Uma instância só, estado em memória, **sem Redis** |
| MVP inclui | **Sala ao vivo + Modo times + Modo solo/treino** | Perguntas customizadas pelo host e geração por IA ficam fora do MVP |
| Identidade | **Login GitHub ou Google para todos** | Via **Supabase Auth** |
| Hospedagem | **Docker em VM própria** | `docker compose` com web, realtime e proxy HTTPS |
| Dados | **Tudo no Supabase** (Postgres + Auth) | Perguntas, partidas e perfis no Supabase |
| Histórico | **Só o resultado de cada partida** | Sem ranking geral nem temporadas no MVP |

## 3. Personas

| Persona | Contexto | O que precisa |
|---|---|---|
| **Host / Facilitador** | Tech lead, organizador de dinâmica do time | Criar sala rápido, escolher temas, dificuldade e times, controlar o ritmo |
| **Jogador** | Dev, analista de dados, estagiário | Entrar rápido, entender a pergunta, ver sua posição |
| **Praticante solo** | Quer estudar no próprio ritmo | Escolher tema e dificuldade, receber explicações |
| **Curador de conteúdo** | Quem cadastra e revisa perguntas | Inserir e editar perguntas no Supabase com segurança |

## 4. Categorias de conteúdo

1. **IA & LLMs**: conceitos de ML, embeddings, RAG, prompt engineering, agentes, avaliação de modelos, tokens e contexto.
2. **Ferramentas de workflow**: Git, Docker, CI/CD, Airflow, Kafka, n8n, Linux/shell.
3. **Programação**: Python, JavaScript/TypeScript, SQL, Java, estruturas de dados, testes, boas práticas.

Cada pergunta tem categoria, tags, dificuldade (`facil` | `medio` | `dificil`) e status. O idioma é `pt-BR`.

## 5. Modos de jogo

### 5.1 Sala ao vivo (MVP)
- O host cria a sala e recebe **PIN de 6 dígitos, QR code e link**.
- Os jogadores (logados) entram no lobby. O apelido vem do perfil e pode ser editado por sala, e o avatar é um emoji.
- O host inicia, e todos recebem a mesma pergunta ao mesmo tempo, com timer.
- Após cada pergunta aparecem a distribuição de respostas, a correta, uma explicação curta e o **top 5**.
- Ao final: pódio (top 3), ranking completo e acertos por categoria.

### 5.2 Modo times (MVP)
- O host define de 2 a 4 times. A distribuição pode ser automática e balanceada ou por escolha do jogador.
- A pontuação do time é a **média** dos membros, para que o tamanho do time não decida o resultado.
- O ranking de times aparece junto com o melhor jogador de cada time.

### 5.3 Modo solo / treino (MVP)
- O jogador escolhe categorias, dificuldade e quantidade (5, 10 ou 20).
- O timer é opcional. Com timer, a pontuação é a mesma da sala ao vivo.
- A explicação aparece logo após cada resposta.
- O resultado da sessão é salvo como uma partida do tipo `solo`. Não há ranking acumulado.
- Usa a mesma engine de jogo, via **API HTTP** (não precisa de socket). A validação da resposta acontece no servidor.

### 5.4 Fora do MVP (backlog)
- Perguntas customizadas pelo host (quiz próprio).
- Geração de perguntas assistida por IA (entram como rascunho e passam por revisão).
- Desafio diário, desafio assíncrono, ranking geral e temporadas.

## 6. Tipos de pergunta

| Tipo | Descrição | MVP |
|---|---|---|
| `multiple_choice` | 2 a 4 alternativas, uma correta | ✅ |
| `true_false` | Verdadeiro/Falso | ✅ |
| `code_output` | Mostra um trecho de código e pergunta qual é a saída (com alternativas) | ✅ |
| `multi_select` | Mais de uma alternativa correta | ✅ |
| `ordering` | Ordenar etapas (fluxo do Git, etapas de um DAG) | Backlog |
| `fill_code` | Completar uma lacuna em código | Backlog |

> **O sistema não executa código.** Perguntas de código são estáticas, com resposta pré-definida.

## 7. Pontuação

- **Acerto**: `pontos = round(1000 * (1 - (t_resposta / t_limite) / 2))`, ou seja, entre 500 e 1000.
- **Erro ou sem resposta**: 0 pontos, e o streak volta a zero.
- **Streak**: a partir de 3 acertos seguidos, bônus de `+100 * min(streak - 2, 5)`.
- **Multiplicador de dificuldade** (opção do host): fácil 1x, médio 1,25x, difícil 1,5x.
- **multi_select**: pontuação proporcional (acertos menos erros marcados), com mínimo de 0.
- **O tempo é medido no servidor**, do envio da pergunta até o recebimento da resposta.
- **Desempate**: mais acertos; persistindo o empate, menor tempo médio.
- **Badges de fim de partida**: "Mais rápido", "Maior streak", "Especialista em IA/Workflow/Programação".

**Esclarecimentos de implementação (M1, `packages/game-engine`)**
- O multiplicador vale sobre o total da pergunta (pontos de velocidade + bônus de streak). No modo solo ele não se aplica, porque é uma opção do host.
- `multi_select` parcial: recebe a fração dos pontos de velocidade, sem bônus, e **zera o streak**. Só a resposta exata conta como acerto (para streak, desempate e badges).
- Modo solo sem timer: acerto vale 1000. Resposta depois do prazo (com timer) conta como não respondida.
- Desempate por tempo: média das respostas enviadas. Quem não respondeu nada fica atrás. Empate total divide a posição ("1, 1, 3").
- Times: distribuição automática em round-robin na ordem de entrada (tamanhos diferem em no máximo 1). No modo por escolha, quem entra sem escolher vai para o menor time. Desempate de times: média de acertos.
- Badges: "Mais rápido" usa só o tempo das respostas **corretas**; cada badge vai para um jogador, e empate na métrica fica com quem está melhor no ranking. Sem acertos, não há badge.
- Pausa: o tempo pausado não conta. Ao retomar, a abertura e o prazo da pergunta andam junto.
- Jogador novo só entra no LOBBY (máx. 20). Reconexão é aceita em qualquer fase, com a pontuação preservada.
- Encerrar no meio do jogo leva ao pódio com as perguntas já fechadas; uma pergunta aberta é descartada sem pontuar.

## 8. Requisitos funcionais

### Autenticação
- RF-01: Login com GitHub ou Google via Supabase Auth. Sem login não se joga.
- RF-02: Perfil com nome de exibição e avatar emoji, editáveis.
- RF-03 (opcional, configurável): restringir o login a uma lista de e-mails ou domínios permitidos, já que o uso é interno.

### Host (sala ao vivo)
- RF-04: Criar sala definindo categorias, dificuldade, número de perguntas (5 a 30), tempo por pergunta (10 a 60 s), modo times e multiplicador.
- RF-05: Ver o lobby em tempo real e remover jogador.
- RF-06: Iniciar, pausar, pular pergunta e encerrar.
- RF-07: Tela de projeção ("telão") separada da tela de controle.
- RF-08: Exportar o resultado da partida em CSV.

### Jogador
- RF-09: Entrar por PIN ou link. Um usuário tem uma só sessão ativa por sala.
- RF-10: Responder uma única vez por pergunta.
- RF-11: Ver posição e pontos após cada pergunta.
- RF-12: Reconexão automática: se cair, volta à sala com a pontuação preservada.

### Modo solo
- RF-13: Configurar e iniciar sessão de treino.
- RF-14: Ver resultado e explicações ao final da sessão.
- RF-15: Ver a lista das próprias partidas recentes (somente resultados individuais, sem ranking geral).

### Conteúdo
- RF-16: Perguntas armazenadas na tabela `questions` do Supabase.
- RF-17: No MVP, a curadoria é feita pelo **Table Editor do Supabase**, mais um **script de seed** versionado no repositório para a carga inicial. Um painel admin no app fica para o backlog.
- RF-18: Jogadores podem reportar uma pergunta com problema (tabela `question_reports`).

## 9. Requisitos não funcionais

- **Latência**: eventos entregues em menos de 300 ms (p95) na rede interna.
- **Capacidade**: até 20 jogadores por sala e cerca de 10 salas simultâneas em uma única instância.
- **Mobile-first**: funcionar em telas de 360 px; telão otimizado para projetor.
- **Acessibilidade**: contraste AA, alternativas identificadas por cor **e** forma, navegação por teclado.
- **Segurança**:
  - A resposta correta **nunca** chega ao cliente antes de `question:reveal`.
  - A tabela `questions` fica **sem acesso direto pelo cliente** (RLS bloqueando `anon` e `authenticated`). Só o servidor lê, com a service role key.
  - O JWT do Supabase é validado no handshake do Socket.IO e nas rotas da API.
  - A service role key existe só no servidor (variável de ambiente) e nunca no bundle do front.
  - Rate limit simples em entrada de sala e em reações.
- **Operação**: `docker compose up -d` sobe tudo; logs estruturados (JSON); health checks.

## 10. Stack

| Camada | Escolha | Observação |
|---|---|---|
| Front-end | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Build `standalone` para Docker |
| Realtime | **Node.js + Socket.IO** | Estado das salas **em memória**, em uma única instância |
| Banco | **Supabase Postgres** | Perguntas, perfis, partidas, reports |
| Auth | **Supabase Auth** (GitHub + Google) | JWT reutilizado no socket |
| Acesso a dados (servidor) | **supabase-js com service role** | Tipos gerados com `supabase gen types` |
| Migrações | **Supabase CLI** (`supabase/migrations`) | Schema versionado no repositório |
| Validação | **Zod** | Payloads de eventos e API |
| Highlight de código | **Shiki** | |
| Testes | **Vitest** (engine e servidor) + **Playwright** (E2E com vários jogadores) | |
| Infra | **Docker Compose** em VM própria: `web`, `realtime`, `caddy` (proxy reverso com HTTPS) | |
| Monorepo | **pnpm workspaces** | |

> **Por que sem Redis:** com até 20 jogadores por sala e uma instância, o estado em memória basta. Se uma partida estiver em andamento quando o servidor reiniciar, ela se perde, e isso é aceitável no MVP. O estado fica isolado atrás de uma interface `RoomStore`, para que trocar por Redis no futuro seja simples.

### Estrutura de pastas
```
devquiz-arena/
├── apps/
│   ├── web/              # Next.js: login, host, jogador, telão, modo solo
│   └── realtime/         # Socket.IO + API HTTP do modo solo
├── packages/
│   ├── shared/           # Tipos, schemas Zod, contrato de eventos
│   └── game-engine/      # Regras puras: estados, pontuação, times (100% testável)
├── supabase/
│   ├── migrations/       # SQL do schema + RLS
│   └── seed/             # Script de seed + perguntas iniciais
├── infra/
│   ├── docker-compose.yml
│   └── Caddyfile
└── docs/
    └── prd.md
```

## 11. Modelo de dados (Supabase)

```sql
-- perfis (1:1 com auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_emoji text default '🙂',
  created_at timestamptz default now()
);

create type question_type as enum ('multiple_choice','true_false','code_output','multi_select');
create type category as enum ('IA','WORKFLOW','PROGRAMACAO');
create type difficulty as enum ('facil','medio','dificil');
create type question_status as enum ('draft','published','archived');

create table questions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- ex.: py-001
  type question_type not null,
  category category not null,
  tags text[] default '{}',
  difficulty difficulty not null,
  prompt text not null,                -- markdown
  code text,
  code_lang text,
  options jsonb not null,              -- [{ "id": "a", "text": "..." }]
  correct jsonb not null,              -- ["b"] ou ["a","c"]
  explanation text not null,
  status question_status default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('live','solo')),
  host_id uuid references profiles,
  settings jsonb not null,
  started_at timestamptz not null,
  ended_at timestamptz
);

create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches on delete cascade,
  user_id uuid references profiles,
  nickname text not null,
  team text,
  score int not null,
  correct_count int not null,
  avg_time_ms int,
  rank int
);

create table question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions,
  user_id uuid references profiles,
  reason text,
  created_at timestamptz default now()
);
```

**RLS**
- `questions`: nenhuma policy para `anon` e `authenticated`; só a service role (servidor) acessa.
- `profiles`: cada usuário lê e edita apenas o próprio perfil.
- `matches` e `match_players`: escrita só pelo servidor; leitura pelo jogador apenas das partidas em que participou.
- `question_reports`: o usuário insere os próprios reports; leitura só pelo servidor.

## 12. Máquina de estados

**Sala ao vivo**
```
LOBBY → COUNTDOWN → QUESTION_OPEN → QUESTION_CLOSED → REVEAL → LEADERBOARD
                          ↑                                         │
                          └──────────── próxima pergunta ───────────┘
LEADERBOARD (última) → PODIUM → FINISHED
Qualquer estado → PAUSED (host) → estado anterior
```

**Modo solo**
```
CONFIG → QUESTION → FEEDBACK → (próxima) … → SUMMARY
```

## 13. Contratos

### Socket.IO (sala ao vivo)
O handshake envia `auth: { token: <supabase access_token> }`, e o servidor valida o token antes de aceitar a conexão.

| Direção | Evento | Payload |
|---|---|---|
| C→S | `room:create` | settings |
| C→S | `room:join` | { pin, nickname?, avatar? } |
| S→C | `room:state` | estado público da sala |
| S→C | `lobby:update` | jogadores e times |
| C→S | `team:choose` | { team } |
| C→S | `host:start` / `host:next` / `host:pause` / `host:resume` / `host:end` / `host:kick` | — |
| S→C | `question:show` | pergunta **sem** a resposta + `deadline` do servidor |
| C→S | `answer:submit` | { questionId, answer } |
| S→C | `answer:ack` | { received: true } |
| S→C | `question:reveal` | correta, explicação, distribuição, resultado do jogador |
| S→C | `leaderboard:update` | top N, times, posição do jogador |
| S→C | `match:podium` | resultado final |
| C↔S | `reaction:send` / `reaction:broadcast` | emoji |

### API HTTP (modo solo)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/solo/sessions` | Cria a sessão com a configuração e devolve a primeira pergunta (sem a resposta) |
| POST | `/api/solo/sessions/:id/answers` | Envia a resposta; devolve correção, explicação, pontos e a próxima pergunta |
| GET | `/api/solo/sessions/:id/summary` | Resumo final |
| GET | `/api/me/matches` | Partidas recentes do usuário |
| POST | `/api/questions/:id/report` | Reportar pergunta |

Todos os payloads são validados com Zod, a partir de `packages/shared`.

## 14. Telas (MVP)

1. **Login**: GitHub ou Google.
2. **Home**: "Criar sala", "Entrar com PIN", "Treinar sozinho", "Minhas partidas".
3. **Configurar sala**: categorias, dificuldade, quantidade, tempo, times, multiplicador.
4. **Lobby**: PIN grande, QR code, jogadores entrando, escolha de time.
5. **Pergunta (jogador)**: enunciado, código com highlight, alternativas grandes (cor e forma), timer.
6. **Pergunta (telão)**: enunciado, timer, contador de respostas.
7. **Revelação**: resposta correta, explicação, distribuição das respostas.
8. **Ranking parcial**: top 5 individual e ranking de times.
9. **Pódio e resultados**: top 3, badges, desempenho por categoria, exportar CSV.
10. **Modo solo**: configuração, pergunta com feedback imediato, resumo.
11. **Minhas partidas**: lista simples dos resultados individuais.

## 15. Marcos (para executar com o Claude Code)

Cada marco termina com testes passando e uma demo funcional.

- **M0. Fundação**: monorepo pnpm, TypeScript estrito, ESLint e Prettier, CI (lint e testes), Dockerfiles, `docker-compose.yml` com `web`, `realtime` e `caddy`, projeto Supabase e `.env.example`.
- **M1. Game engine**: máquina de estados (ao vivo e solo), pontuação, streak, multiplicador, times com média, desempate e badges. Funções puras com cobertura alta.
- **M2. Supabase**: migrações do schema, RLS, tipos gerados, script de seed com cerca de 60 perguntas (20 por categoria).
- **M3. Auth**: login GitHub e Google, criação automática de `profiles`, validação de JWT no servidor e allowlist opcional de e-mails/domínios.
- **M4. Servidor realtime**: salas com PIN, join, reconexão, fluxo completo da partida, `RoomStore` em memória e gravação do resultado em `matches`/`match_players`.
- **M5. UI da sala ao vivo**: home, configuração, lobby, pergunta, revelação, ranking, pódio e telão.
- **M6. Modo times**: escolha e balanceamento, ranking de times, UI.
- **M7. Modo solo**: API HTTP, telas, "Minhas partidas" e report de pergunta.
- **M8. Hardening e deploy**: rate limit, testes E2E com vários jogadores (Playwright), CSV, deploy na VM com HTTPS e um runbook simples.

## 16. Questões em aberto

1. O Supabase será **gerenciado (cloud)** ou **self-hosted** na mesma VM? Considerando a política da empresa sobre dados fora da infra, isso define se o `docker-compose` inclui a stack do Supabase.
2. Haverá restrição de login por domínio de e-mail? Se sim, quais domínios?
3. Quem cadastra e revisa as perguntas? Basta o Table Editor do Supabase no início?
4. Nome definitivo do produto.

## 17. Métricas de sucesso

- Do clique no link até estar no lobby, menos de 15 s (com sessão já logada).
- Pelo menos 90% das partidas iniciadas chegam ao pódio.
- Latência p95 dos eventos abaixo de 300 ms.
- Menos de 2% das perguntas reportadas.
- Uso recorrente: o time usa o quiz em dinâmicas pelo menos 2 vezes por mês.

## 18. Diretrizes para o Claude Code

- Ler este PRD antes de cada marco e trabalhar **um marco por vez**.
- Regras de jogo ficam em `packages/game-engine` como **funções puras**. Nada de lógica de pontuação no front ou nos handlers.
- O contrato de eventos e de API (seção 13) fica em `packages/shared`; qualquer mudança nele também atualiza este PRD.
- Nunca enviar a resposta correta ao cliente antes da revelação, com teste automatizado que garanta isso, tanto no socket quanto na API solo.
- A service role key do Supabase é usada só em `apps/realtime` e nas rotas server-side, nunca em código client.
- Mudanças de schema só por migração em `supabase/migrations`.
- Commits pequenos e convencionais (`feat:`, `fix:`, `test:`, `chore:`).