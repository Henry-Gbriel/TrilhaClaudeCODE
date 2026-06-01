# TrilhaClaudeCODE

Repositório de estudo da trilha **Claude Code** da [Jornada de Dados](https://suajornadadedados.com.br), focada em explorar na prática as capacidades da ferramenta [Claude Code](https://claude.ai/code) da Anthropic.

---

## O que é o Claude Code?

Claude Code é uma CLI oficial da Anthropic que integra o modelo Claude diretamente no terminal e nas IDEs (VS Code, JetBrains). Com ele é possível:

- Gerar, revisar e refatorar código por linguagem natural
- Navegar e entender bases de código desconhecidas
- Executar revisões de segurança e code reviews automatizados
- Criar e corrigir testes
- Fazer commits, abrir PRs e interagir com o GitHub sem sair do terminal

---

## Projeto desenvolvido na trilha

### 🐍 Jogo da Cobrinha — MVP

Um jogo da cobrinha completo para o navegador, construído do zero com Claude Code seguindo o PRD definido em `.llm/prd.md`.

**Tecnologias:** HTML · CSS · JavaScript · Node.js

**Funcionalidades:**
- Jogo da cobrinha jogável no browser com controles de teclado (setas / WASD) e swipe mobile
- Pontuação em tempo real e recorde histórico
- Histórico das últimas partidas persistido em servidor Node.js
- Compartilhamento da pontuação via Web Share API (WhatsApp, etc.) com fallback para clipboard

**Como rodar:**
```bash
cd snake
npm install
npm start
# Acesse http://localhost:3000
```

---

## Fluxo de trabalho com Claude Code

Este repositório demonstra o ciclo completo de desenvolvimento assistido por IA:

1. **PRD** — requisitos descritos em `.llm/prd.md`
2. **Geração** — código criado pelo Claude Code a partir do PRD
3. **Code Review** — revisão automatizada com o comando `/code-review`
4. **Correção** — bugs identificados corrigidos pelo próprio Claude Code
5. **Documentação** — `CLAUDE.md` gerado com `/init` para orientar sessões futuras

---

## Estrutura do repositório

```
.
├── snake/               # Projeto principal (Jogo da Cobrinha)
│   ├── server.js        # API REST Node.js (pontuações)
│   ├── package.json
│   └── public/
│       ├── index.html
│       ├── style.css
│       └── game.js
├── .llm/
│   ├── prd.md           # Product Requirements Document
│   └── CLAUDE.md        # Guia para o Claude Code
├── CLAUDE.md            # Guia raiz para o Claude Code
└── README.md
```

---

## Referências

- [Claude Code — Documentação oficial](https://docs.anthropic.com/pt/docs/claude-code)
- [Jornada de Dados](https://suajornadadedados.com.br)
