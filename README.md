# BIUD — Validador de Transações (Desafio Técnico Fullstack)

Sistema de validação assíncrona de transações financeiras. Uma transação nasce com status **pendente**, é
avaliada por um microserviço **antifraude** (valores acima de `1000` são **rejeitadas**; as demais
**aprovadas**) e o resultado volta para atualizar o registro original — tudo orientado a eventos via **Kafka**.

- **Transações** (`apps/transactions`) — API REST (NestJS) de criação/consulta/listação.
- **Antifraude** (`apps/anti-fraud`) — serviço stateless que consome `transaction.created` e publica `transaction.status.updated`.
- **Dashboard** (`apps/web`) — painel Next.js com listagem, filtros, métricas, gráficos e criação.

---

## Stack

| Camada      | Tecnologia                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------ |
| Runtime     | Node.js **24 LTS** (`.nvmrc`)                                                              |
| Gerenciador | pnpm (workspaces) + Turborepo                                                              |
| Backend     | NestJS + TypeScript (estrito)                                                              |
| ORM         | Prisma + PostgreSQL 16                                                                     |
| Mensageria  | Kafka (kafkajs, KRaft)                                                                     |
| Frontend    | Next.js 15 (App Router) + React 19 + Tailwind + TanStack Query + Zustand + Tremor/Recharts |
| Validação   | Zod (`@repo/shared`)                                                                       |
| Testes      | Vitest + Testing Library                                                                   |

---

## Pré-requisitos

- Node.js 24 LTS e pnpm
- Docker + Docker Compose

---

## Como rodar

```bash
# 1. Variáveis de ambiente (padrão local)
cp .env.example .env

# 2. Infraestrutura (Postgres + Kafka + Kafka UI)
docker compose up -d

# 3. Dependências
pnpm install

# 4. Build do pacote compartilhado + cliente Prisma + migrations
pnpm --filter @repo/shared build
pnpm generate
npx prisma migrate deploy
npx prisma db seed   # opcional: garante o tipo PIX (id 1)

# 5. Subir tudo (watch)
pnpm dev
```

Acesse:

| Serviço              | Endereço                       |
| -------------------- | ------------------------------ |
| Dashboard            | http://localhost:3000          |
| API de transações    | http://localhost:3001          |
| API antifraude       | http://localhost:3002          |
| Swagger (transações) | http://localhost:3001/api/docs |
| Swagger (antifraude) | http://localhost:3002/api/docs |
| Kafka UI             | http://localhost:8080          |
| Postgres             | `localhost:5432`               |

---

## Como testar

```bash
pnpm quality          # roda generate + lint + typecheck + format + testes + build
pnpm test             # só os testes (Turbo em todos os packages)
pnpm format:check     # verifica formatação
```

O mesmo `pnpm quality` roda no CI (`.github/workflows/ci.yml`) a cada push/PR.

---

## Fluxo rápido (sem Postman, pelo Swagger)

1. Abra http://localhost:3001/api/docs → `POST /api/transactions` → **Try it out**.
2. No dashboard (http://localhost:3000) use **"+ Nova transação"** e informe apenas o valor.
3. A transação aparece como `Pendente` e, em ~3s, vira `Aprovada` (valor ≤ 1000) ou `Rejeitada` (valor > 1000).

Exemplo via `curl`:

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"accountExternalIdDebit":"550e8400-e29b-41d4-a716-446655440000","accountExternalIdCredit":"550e8400-e29b-41d4-a716-446655440001","transferTypeId":1,"value":120}'
```

---

## Estrutura

```
apps/
  transactions/   NestJS (3001) — POST/GET/listação, producer/consumer Kafka
  anti-fraud/     NestJS (3002) — consome transaction.created, publica transaction.status.updated
  web/            Next.js (3000) — dashboard, detalhe, criação
packages/
  shared/         Zod: create, eventos (created/status.updated) e query de listagem
  eslint-config/  flat config compartilhada
  tsconfig/       base strict
prisma/           schema + migrations + seed
```

---

## Decisões de arquitetura

As escolhas estruturantes (monorepo, modelagem, formato de eventos, semântica de mensageria, polling,
testes, concorrência, etc.) estão documentadas em **[DECISIONS.md](./DECISIONS.md)**, com alternativa
considerada e justificativa para cada uma.

---

## O que ficou de fora (e por quê)

- **Dark mode** — escopo limitado a um tema claro único.
- **`GET /transactions/stats` (agregação dedicada)** — as métricas reutilizam o `meta.total` do endpoint
  paginado (`limit:1`); um endpoint de stats é o próximo passo natural sob alto volume.
- **Testcontainers / E2E reais** — os testes usam mocks (rápidos, sem Docker no CI); o fluxo real é
  documentado como evolução.
- **Outbox / exactly-once** — `at-least-once` + idempotência atende o volume inicial; evolução em `DECISIONS.md`.

---

_Projeto criado como entrega do desafio técnico — leia [PRACTICES.md](./PRACTICES.md) para os requisitos
originais (quality gate, Conventional Commits, branches/PRs, registro de decisões)._
