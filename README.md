# 🎾 EasyTennis

**🌐 Language / Idioma:**  **English** · [Português 🇧🇷](#-easytennis--português)

<a href="https://easytennis-bice.vercel.app/login">
  <img src="https://img.shields.io/badge/▶_Try_the_live_app-Open_EasyTennis-2ea44f?style=for-the-badge" alt="Try the live app" />
</a>

> A mobile-first web app for splitting the cost of tennis court rentals fairly among the people who actually showed up.

EasyTennis is a full-stack application built with **Spring Boot 4 (Java 21)** and **Next.js 16 (React 19)**. It is also a study in **agentic software engineering** — the repository ships with a documented harness of `CLAUDE.md` guardrails, a recurring security-audit framework, and an architectural decision log that together turn an AI coding assistant into a disciplined, reviewable contributor.

> 🔗 **Live demo:** [easytennis-bice.vercel.app](https://easytennis-bice.vercel.app/login) — register an account and try the full flow.

**NOTE:** The backend is hosted on Render, and the free tier shuts the server down after a while. When you try EasyTennis for the first time, you may get an error or have to wait for a minute or two for the server to go live and complete the login.

---

## The problem

If you play tennis in rented courts, you know the recurring friction: a group books one or more courts for a couple of hours, somebody pays the whole bill up front, and afterwards everyone has to work out who owes what. Attendance varies week to week, not everyone who was invited shows up, and re-typing the same names and emails every single session is tedious.

**EasyTennis removes that friction.** It lets a player:

1. Keep a **reusable roster** of the people they play with.
2. Log a **game day** — date, number of courts, hours played, total price, and who attended (picked from the roster).
3. **Split the cost** across any subset of attendees — because the people who play don't always pay, and the people who pay don't always all split evenly.

The per-player amount is `total price ÷ number of selected payers`, rounded to two decimals — shown clearly next to each name.

---

## How it works

```
┌──────────────────────┐         HTTPS / JWT          ┌──────────────────────┐
│   Next.js 16 (SPA)   │  ───────────────────────▶    │  Spring Boot 4 API   │
│   React 19 · Vercel  │   Authorization: Bearer …    │  Java 21 · Render    │
└──────────┬───────────┘                              └──────────┬───────────┘
           │                                                     │
   localStorage JWT                                       Spring Data JPA
   client-side guards                                            │
                                                       ┌─────────▼──────────┐
                                                       │  PostgreSQL (Neon) │
                                                       └────────────────────┘
```

| Capability | What happens |
|---|---|
| **Auth** | Email + password registration. Login returns a short-lived JWT access token; a rotating refresh token extends the session. Passwords are BCrypt-hashed. |
| **Password recovery** | A 6-digit, single-use OTP (cryptographically random) is emailed via Gmail SMTP, valid for 15 minutes, then consumed on reset. |
| **Player roster** | Per-user CRUD list of frequent players (`/players`). A unique `(user, email)` constraint keeps each roster clean without colliding across users. |
| **Game days** | Create/edit a game day; attendees are picked from the roster via a checkbox list rather than retyped. |
| **Cost split** | Pick a game day, check who's paying, and get the per-head amount computed server-side. |

---

## Tech stack

### Backend (`/api`)
- **Java 21**, **Spring Boot 4.0.6**
- **Spring Security** — stateless JWT authentication, BCrypt, CORS, security headers
- **Spring Data JPA / Hibernate** — persistence over **PostgreSQL 17**
- **JJWT 0.12** — token signing/verification
- **Bucket4j** — in-memory, per-IP rate limiting on auth endpoints
- **Spring Mail** — transactional password-reset emails
- **Lombok** — boilerplate reduction
- **Docker Compose integration** — Spring auto-starts the Postgres container during local dev

### Frontend (`/frontend`)
- **Next.js 16.2** (App Router, Turbopack) on **React 19.2**, **TypeScript** strict mode
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) for a mobile-first UI
- **React Hook Form** + **Zod** for typed, validated forms
- **jwt-decode** + a small typed API client (`app/lib/api.ts`) with a custom `ApiError`

### Infrastructure
- **Vercel** (frontend) · **Render** (Dockerized backend) · **Neon** serverless PostgreSQL
- Multi-stage **Dockerfile** for the API (Maven build → slim JRE runtime)
- Fully **environment-driven configuration** — no secrets in source; `${ENV_VAR}` placeholders throughout

---

## Architectural decisions

These are the trade-offs I made deliberately; each is recorded with its rationale in [`DECISIONS.md`](DECISIONS.md).

| Decision | Why |
|---|---|
| **Strict 3-layer backend** (`controller → service → repository`) with DTOs separate from entities | Keeps the HTTP contract decoupled from the persistence model; SOLID is enforced as a project rule, not a suggestion. |
| **`Player` as `@Embeddable`, `PlayerProfile` as a first-class `@Entity`** | A game day's attendees are a value-object snapshot (`game_day_players`); the reusable roster is a managed table. Adding the roster therefore required **no migration** to the existing game-day model. |
| **Orphan-player preservation in the edit form** | Attendees recorded before the roster feature — or later removed from it — still render as pre-checked, disabled rows so historical game days are never silently mutated. |
| **Stateless JWT + rotating refresh tokens** | Access tokens are short-lived (15 min default) to shrink the theft window; refresh tokens extend the session without a long-lived bearer. |
| **Rate limiting via a `OncePerRequestFilter` + Bucket4j** | Brute-force and OTP-exhaustion protection scoped to `/auth/login` (5/min) and reset endpoints (3/min), returning `429` with `Retry-After`. |
| **Security headers set in `SecurityConfig`** | CSP, HSTS, `X-Frame-Options: DENY`, and `Referrer-Policy` are applied at the framework layer rather than relying on platform defaults. |
| **`server.error.include-stacktrace=never` + global exception handler** | Clients get generic messages; internal structure never leaks. |
| **Client-side roster search with `useMemo`; `Promise.all` for parallel fetches** | Per-user lists are small, so filtering stays local; the edit page loads the game day and roster concurrently to avoid sequential latency. |
| **`ddl-auto=update` for this MVP** | New tables (`player_profiles`, `refresh_tokens`, `password_reset_codes`) are created automatically — appropriate for an MVP, with a migration tool (Flyway/Liquibase) as the documented next step. |

---

## Harness engineering — AI as a disciplined contributor

A distinguishing aspect of this repo is that it was built *with* an AI coding assistant under an explicit, version-controlled **engineering harness**. Rather than ad-hoc prompting, the workflow is governed by committed documents that act as guardrails and institutional memory:

| File | Role |
|---|---|
| [`api/CLAUDE.md`](api/CLAUDE.md) · [`frontend/CLAUDE.md`](frontend/CLAUDE.md) | **Per-package operating manuals.** They pin the stack, encode the clean-architecture rules (3 layers, SOLID, no duplication), the testing standards (real Postgres, never mock the DB; cover null/empty/boundary/duplicate/unauthorized), and a mandatory **Development Protocol** — read `DECISIONS.md` first, log every change in a structured `[LOG]` block, then build, lint, security-review, and document before a PR is allowed. |
| [`frontend/CLAUDE.md`](frontend/CLAUDE.md) (Next.js 16 section) | Counters stale model knowledge by documenting the **breaking changes** in Next.js 16 (async `cookies()`/`params`, `proxy.ts` replacing middleware, Turbopack defaults) and instructs the agent to read `node_modules/next/dist/docs/` before writing code. |
| [`DECISIONS.md`](DECISIONS.md) | A timestamped **architectural decision log.** Every feature lands with a `[LOG]` entry (Change / Reason / Approach), an options-considered table, the files touched, and build/lint results — so any reviewer can reconstruct *why*, not just *what*. |
| [`docs/SECURITY-REVIEW.md`](docs/SECURITY-REVIEW.md) | A reusable **34-point security audit checklist** (auth, injection, API security, secrets, dependencies, error handling, data protection) with concrete "how to evaluate" steps and test commands for each item. |
| [`docs/SECURITY-ASSESSMENTS.md`](docs/SECURITY-ASSESSMENTS.md) | The **dated findings** of running that checklist — each item marked PASS / FAIL / NEEDS-REVIEW with file-and-line evidence, plus a prioritized action list. The rate limiting, security headers, refresh-token rotation, and stacktrace hardening shipped in this repo are the *closed* items from that assessment. |
| [`docs/PRODUCTION-DEPLOY.md`](docs/PRODUCTION-DEPLOY.md) | A step-by-step, dependency-ordered **deployment runbook** (Neon → Render → Vercel → CORS), including the env-var matrix and a risk table. |

The result is a feedback loop: **plan → log the decision → implement → audit against the security checklist → record findings → close them in the next change.** The security assessment didn't just sit in a document — its FAIL items (no rate limiting, missing headers, 24h tokens, no refresh rotation) became the very features hardened in later commits.

---

## Running locally

**Prerequisites:** JDK 21, Node.js 22+, Docker Desktop running.

### Backend
```bash
cd api
./mvnw spring-boot:run        # macOS / Linux
mvnw.cmd spring-boot:run      # Windows
# Spring Boot auto-starts PostgreSQL via compose.yaml; API on http://localhost:8080
```
Provide `JWT_SECRET`, `MAIL_USER`, and `MAIL_PASSWORD` via `api/.env.development` (see `application.properties` for the full list of `${ENV_VAR}` placeholders).

### Frontend
```bash
cd frontend
npm install
npm run dev                   # App on http://localhost:3000
```
Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` in `frontend/.env.local`.

### Tests
```bash
cd api && ./mvnw test         # backend unit tests (auth + email flows)
cd frontend && npm run build  # type-check + production build
```

---

## Project layout

```
easytennis/
├── api/                      # Spring Boot 4 backend (Java 21)
│   ├── src/main/java/com/easytennis/
│   │   ├── controller/       # REST layer (auth, game days, cost split, players)
│   │   ├── service/          # business logic
│   │   ├── repository/       # Spring Data JPA
│   │   ├── entity/           # JPA entities (User, GameDay, Player, PlayerProfile, …)
│   │   ├── dto/              # request/response records, grouped by domain
│   │   ├── security/         # JWT filter, rate-limit filter, UserDetails
│   │   ├── config/           # SecurityConfig (filter chain, CORS, headers)
│   │   └── util/             # JwtUtil
│   ├── Dockerfile            # multi-stage build → slim JRE image
│   └── compose.yaml          # local PostgreSQL 17
├── frontend/                 # Next.js 16 frontend (React 19, TS, Tailwind v4)
│   └── app/
│       ├── (auth)/login/     # login · register · forgot/verify/reset
│       ├── (protected)/      # home · gamedays · cost-split · players
│       ├── components/       # GameDayForm, Header, Spinner
│       ├── context/          # AuthContext
│       └── lib/api.ts        # typed API client
├── docs/                     # deployment + security harness
├── DECISIONS.md              # architectural decision log
└── CLAUDE.md (per package)   # AI engineering harness / operating manuals
```

---

## Status

This is a portfolio MVP demonstrating full-stack delivery and AI-assisted engineering discipline. The core flows — auth, password recovery, roster management, game-day logging, and cost splitting — are implemented, tested, and documented end to end. Documented next steps include a dedicated migration tool (Flyway), CI-integrated dependency scanning, and the remaining `NEEDS-REVIEW` infrastructure verifications from the security assessment.

---
---

# 🎾 EasyTennis — Português

**🌐 Idioma / Language:**  **Português** · [English 🇬🇧](#-easytennis)

<a href="https://easytennis-bice.vercel.app/login">
  <img src="https://img.shields.io/badge/▶_Testar_o_app_online-Abrir_EasyTennis-2ea44f?style=for-the-badge" alt="Testar o app online" />
</a>

> Um aplicativo web mobile-first para dividir de forma justa o custo do aluguel de quadras de tênis entre as pessoas que realmente compareceram.

EasyTennis é uma aplicação full-stack construída com **Spring Boot 4 (Java 21)** e **Next.js 16 (React 19)**. É também um estudo de **engenharia de software agêntica** — o repositório inclui um conjunto documentado de guardrails em arquivos `CLAUDE.md`, um framework recorrente de auditoria de segurança e um registro de decisões arquiteturais que, juntos, transformam um assistente de programação por IA em um contribuidor disciplinado e revisável.

> 🔗 **Demo ao vivo:** [easytennis-bice.vercel.app](https://easytennis-bice.vercel.app/login) — crie uma conta e experimente o fluxo completo.

**ATENÇÃO** O backend está hospedado no Render, e o plano grátis desliga o servidor após um período. Ao testar EasyTennis pela primeira vez, você poderá encontrar um erro ou ter que aguardar alguns instantes para que o servidor suba.

---

## O problema

Quem joga tênis em quadras alugadas conhece bem o atrito recorrente: um grupo reserva uma ou mais quadras por algumas horas, alguém paga a conta inteira na hora, e depois todos precisam descobrir quem deve quanto. A presença varia de semana para semana, nem todos os convidados aparecem, e redigitar os mesmos nomes e e-mails a cada sessão é cansativo.

**O EasyTennis elimina esse atrito.** Ele permite que um jogador:

1. Mantenha uma **lista reutilizável** das pessoas com quem joga.
2. Registre um **dia de jogo** — data, número de quadras, horas jogadas, preço total e quem compareceu (selecionado a partir da lista).
3. **Divida o custo** entre qualquer subconjunto de participantes — porque quem joga nem sempre paga, e quem paga nem sempre divide igualmente.

O valor por jogador é `preço total ÷ número de pagantes selecionados`, arredondado para duas casas decimais — exibido claramente ao lado de cada nome.

---

## Como funciona

```
┌──────────────────────┐         HTTPS / JWT          ┌──────────────────────┐
│   Next.js 16 (SPA)   │  ───────────────────────▶    │  Spring Boot 4 API   │
│   React 19 · Vercel  │   Authorization: Bearer …    │  Java 21 · Render    │
└──────────┬───────────┘                              └──────────┬───────────┘
           │                                                     │
   JWT no localStorage                                    Spring Data JPA
   proteção no cliente                                           │
                                                       ┌─────────▼──────────┐
                                                       │  PostgreSQL (Neon) │
                                                       └────────────────────┘
```

| Recurso | O que acontece |
|---|---|
| **Autenticação** | Cadastro com e-mail e senha. O login retorna um token de acesso JWT de curta duração; um refresh token rotativo estende a sessão. As senhas são protegidas com hash BCrypt. |
| **Recuperação de senha** | Um código OTP de 6 dígitos, de uso único (gerado de forma criptograficamente segura), é enviado por e-mail via Gmail SMTP, válido por 15 minutos e consumido na redefinição. |
| **Lista de jogadores** | Lista CRUD de jogadores frequentes por usuário (`/players`). Uma restrição única `(usuário, e-mail)` mantém cada lista organizada sem conflitar entre usuários. |
| **Dias de jogo** | Crie/edite um dia de jogo; os participantes são selecionados da lista por meio de caixas de seleção, em vez de redigitados. |
| **Divisão de custo** | Escolha um dia de jogo, marque quem vai pagar e obtenha o valor por pessoa calculado no servidor. |

---

## Stack tecnológica

### Backend (`/api`)
- **Java 21**, **Spring Boot 4.0.6**
- **Spring Security** — autenticação JWT stateless, BCrypt, CORS, cabeçalhos de segurança
- **Spring Data JPA / Hibernate** — persistência sobre **PostgreSQL 17**
- **JJWT 0.12** — assinatura/verificação de tokens
- **Bucket4j** — rate limiting em memória, por IP, nos endpoints de autenticação
- **Spring Mail** — e-mails transacionais de redefinição de senha
- **Lombok** — redução de código boilerplate
- **Integração com Docker Compose** — o Spring inicia automaticamente o contêiner do Postgres no desenvolvimento local

### Frontend (`/frontend`)
- **Next.js 16.2** (App Router, Turbopack) sobre **React 19.2**, **TypeScript** em modo estrito
- **Tailwind CSS v4** + **shadcn/ui** (primitivos Radix) para uma interface mobile-first
- **React Hook Form** + **Zod** para formulários tipados e validados
- **jwt-decode** + um cliente de API tipado (`app/lib/api.ts`) com um `ApiError` customizado

### Infraestrutura
- **Vercel** (frontend) · **Render** (backend em Docker) · **Neon** PostgreSQL serverless
- **Dockerfile** multi-stage para a API (build com Maven → runtime JRE enxuto)
- Configuração totalmente **orientada por variáveis de ambiente** — nenhum segredo no código-fonte; placeholders `${ENV_VAR}` em todo lugar

---

## Decisões arquiteturais

Estas são as escolhas que fiz deliberadamente; cada uma está registrada com sua justificativa em [`DECISIONS.md`](DECISIONS.md).

| Decisão | Por quê |
|---|---|
| **Backend estrito em 3 camadas** (`controller → service → repository`) com DTOs separados das entidades | Mantém o contrato HTTP desacoplado do modelo de persistência; SOLID é uma regra do projeto, não uma sugestão. |
| **`Player` como `@Embeddable`, `PlayerProfile` como `@Entity` de primeira classe** | Os participantes de um dia de jogo são um snapshot de objeto de valor (`game_day_players`); a lista reutilizável é uma tabela gerenciada. Adicionar a lista, portanto, **não exigiu migração** do modelo de dias de jogo existente. |
| **Preservação de jogadores "órfãos" no formulário de edição** | Participantes registrados antes do recurso de lista — ou removidos dela posteriormente — ainda aparecem como linhas pré-marcadas e desabilitadas, para que dias de jogo históricos nunca sejam alterados silenciosamente. |
| **JWT stateless + refresh tokens rotativos** | Tokens de acesso de curta duração (15 min por padrão) reduzem a janela de roubo; refresh tokens estendem a sessão sem um bearer de longa duração. |
| **Rate limiting via `OncePerRequestFilter` + Bucket4j** | Proteção contra força bruta e exaustão de OTP, restrita a `/auth/login` (5/min) e endpoints de redefinição (3/min), retornando `429` com `Retry-After`. |
| **Cabeçalhos de segurança definidos no `SecurityConfig`** | CSP, HSTS, `X-Frame-Options: DENY` e `Referrer-Policy` são aplicados na camada do framework, em vez de depender dos padrões da plataforma. |
| **`server.error.include-stacktrace=never` + handler global de exceções** | Os clientes recebem mensagens genéricas; a estrutura interna nunca vaza. |
| **Busca da lista no cliente com `useMemo`; `Promise.all` para buscas paralelas** | Listas por usuário são pequenas, então a filtragem permanece local; a página de edição carrega o dia de jogo e a lista simultaneamente para evitar latência sequencial. |
| **`ddl-auto=update` para este MVP** | Novas tabelas (`player_profiles`, `refresh_tokens`, `password_reset_codes`) são criadas automaticamente — adequado para um MVP, com uma ferramenta de migração (Flyway/Liquibase) como próximo passo documentado. |

---

## Engenharia de harness — a IA como contribuidora disciplinada

Um aspecto distintivo deste repositório é que ele foi construído *com* um assistente de programação por IA sob um **harness de engenharia** explícito e versionado. Em vez de prompts ad-hoc, o fluxo de trabalho é governado por documentos versionados que funcionam como guardrails e memória institucional:

| Arquivo | Função |
|---|---|
| [`api/CLAUDE.md`](api/CLAUDE.md) · [`frontend/CLAUDE.md`](frontend/CLAUDE.md) | **Manuais operacionais por pacote.** Fixam a stack, codificam as regras de arquitetura limpa (3 camadas, SOLID, sem duplicação), os padrões de teste (Postgres real, nunca mockar o banco; cobrir nulos/vazios/limites/duplicatas/acesso não autorizado) e um **Protocolo de Desenvolvimento** obrigatório — ler o `DECISIONS.md` primeiro, registrar cada mudança em um bloco `[LOG]` estruturado, depois buildar, lintar, revisar a segurança e documentar antes de permitir um PR. |
| [`frontend/CLAUDE.md`](frontend/CLAUDE.md) (seção Next.js 16) | Contraria o conhecimento desatualizado do modelo documentando as **breaking changes** do Next.js 16 (`cookies()`/`params` assíncronos, `proxy.ts` substituindo o middleware, Turbopack por padrão) e instrui o agente a ler `node_modules/next/dist/docs/` antes de escrever código. |
| [`DECISIONS.md`](DECISIONS.md) | Um **registro de decisões arquiteturais** com timestamps. Cada recurso entra com uma entrada `[LOG]` (Mudança / Motivo / Abordagem), uma tabela de opções consideradas, os arquivos alterados e os resultados de build/lint — para que qualquer revisor reconstrua o *porquê*, não apenas o *quê*. |
| [`docs/SECURITY-REVIEW.md`](docs/SECURITY-REVIEW.md) | Um **checklist reutilizável de auditoria de segurança com 34 pontos** (autenticação, injeção, segurança de API, segredos, dependências, tratamento de erros, proteção de dados) com passos concretos de "como avaliar" e comandos de teste para cada item. |
| [`docs/SECURITY-ASSESSMENTS.md`](docs/SECURITY-ASSESSMENTS.md) | Os **achados datados** da execução desse checklist — cada item marcado como PASS / FAIL / NEEDS-REVIEW com evidência de arquivo e linha, além de uma lista de ações priorizada. O rate limiting, os cabeçalhos de segurança, a rotação de refresh tokens e o hardening de stacktrace presentes neste repositório são os itens *fechados* dessa avaliação. |
| [`docs/PRODUCTION-DEPLOY.md`](docs/PRODUCTION-DEPLOY.md) | Um **runbook de deploy** passo a passo, ordenado por dependências (Neon → Render → Vercel → CORS), incluindo a matriz de variáveis de ambiente e uma tabela de riscos. |

O resultado é um ciclo de feedback: **planejar → registrar a decisão → implementar → auditar contra o checklist de segurança → registrar os achados → fechá-los na próxima mudança.** A avaliação de segurança não ficou apenas em um documento — seus itens FAIL (sem rate limiting, sem cabeçalhos, tokens de 24h, sem rotação de refresh) tornaram-se exatamente os recursos endurecidos nos commits seguintes.

---

## Executando localmente

**Pré-requisitos:** JDK 21, Node.js 22+, Docker Desktop em execução.

### Backend
```bash
cd api
./mvnw spring-boot:run        # macOS / Linux
mvnw.cmd spring-boot:run      # Windows
# O Spring Boot inicia o PostgreSQL automaticamente via compose.yaml; API em http://localhost:8080
```
Forneça `JWT_SECRET`, `MAIL_USER` e `MAIL_PASSWORD` via `api/.env.development` (veja `application.properties` para a lista completa de placeholders `${ENV_VAR}`).

### Frontend
```bash
cd frontend
npm install
npm run dev                   # App em http://localhost:3000
```
Defina `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` em `frontend/.env.local`.

### Testes
```bash
cd api && ./mvnw test         # testes unitários do backend (fluxos de auth + e-mail)
cd frontend && npm run build  # verificação de tipos + build de produção
```

---

## Estrutura do projeto

```
easytennis/
├── api/                      # Backend Spring Boot 4 (Java 21)
│   ├── src/main/java/com/easytennis/
│   │   ├── controller/       # Camada REST (auth, dias de jogo, divisão de custo, jogadores)
│   │   ├── service/          # lógica de negócio
│   │   ├── repository/       # Spring Data JPA
│   │   ├── entity/           # entidades JPA (User, GameDay, Player, PlayerProfile, …)
│   │   ├── dto/              # records de request/response, agrupados por domínio
│   │   ├── security/         # filtro JWT, filtro de rate-limit, UserDetails
│   │   ├── config/           # SecurityConfig (filter chain, CORS, cabeçalhos)
│   │   └── util/             # JwtUtil
│   ├── Dockerfile            # build multi-stage → imagem JRE enxuta
│   └── compose.yaml          # PostgreSQL 17 local
├── frontend/                 # Frontend Next.js 16 (React 19, TS, Tailwind v4)
│   └── app/
│       ├── (auth)/login/     # login · cadastro · esqueci/verificar/redefinir
│       ├── (protected)/      # home · dias de jogo · divisão de custo · jogadores
│       ├── components/       # GameDayForm, Header, Spinner
│       ├── context/          # AuthContext
│       └── lib/api.ts        # cliente de API tipado
├── docs/                     # deploy + harness de segurança
├── DECISIONS.md              # registro de decisões arquiteturais
└── CLAUDE.md (por pacote)    # harness de engenharia por IA / manuais operacionais
```

---

## Status

Este é um MVP de portfólio que demonstra entrega full-stack e disciplina de engenharia assistida por IA. Os fluxos centrais — autenticação, recuperação de senha, gerenciamento da lista de jogadores, registro de dias de jogo e divisão de custo — estão implementados, testados e documentados de ponta a ponta. Os próximos passos documentados incluem uma ferramenta de migração dedicada (Flyway), varredura de dependências integrada à CI e as verificações de infraestrutura `NEEDS-REVIEW` restantes da avaliação de segurança.
