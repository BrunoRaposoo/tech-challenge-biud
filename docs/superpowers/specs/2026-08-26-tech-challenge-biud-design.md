# Design — Desafio Técnico BIUD Fullstack (Opção A — Turborepo + Shared)

**Data:** 2026-08-26  
**Status:** Aprovado (brainstorming)  
**Stack obrigatória:** Node 24 LTS + pnpm + NestJS + Prisma + Postgres + Kafka + Next.js + React + Tailwind + Vitest  
**Runtime adotado:** Node 24 LTS (atualiza de 22+ do README para LTS mais recente; ver §3 e DECISIONS.md: segurança, compatibilidade e suporte prolongado — README permite mudar infra “se sua arquitetura pedir outra coisa, registre o porquê”)  
**Infra local:** `docker-compose.yml` (Postgres 16-alpine, confluentinc/cp-kafka:7.7.1 KRaft, kafka-ui)  
**Fluxo feature-by-feature:** Fundação → Transações criação/recuperação → Anti-fraud + consumo retorno → Listagem paginada → Frontend dashboard → Polimento

---

## 1. Visão Geral e Princípios

**Opção escolhida: A — Turborepo + Shared + Single DB** (entre A/B/C comparadas em `architecture-options.html`).

- **Monorepo `pnpm workspaces + Turborepo`** com cache de pipeline para `pnpm quality` (lint + typecheck + format:check + test + build) — mesmo comando local e CI, exigido por `PRACTICES.md`.
- **Single Postgres + Prisma 1 schema** — simplicidade operacional para o desafio, cada serviço acessa apenas suas tabelas, migrations versionadas.
- **Pacote `@repo/shared` com Zod** — contratos Kafka compartilhados, validação consistente, sem drift.
- **TanStack Query polling dinâmico + Zustand mínimo** — resolve transação `PENDING` que muda fora do request sem custo de SSE/WebSocket.
- **Tratamento de erro hierárquico (Nest Exception Filters + Zod pipe)** — sem retornos genéricos, erros por campo.

> Consultas Context7 realizadas: TanStack Query (`/tanstack/query` — `refetchInterval` dinâmico, optimistic updates), Zustand (`/pmndrs/zustand` — comparação com Redux Toolkit), NestJS (`/nestjs/docs.nestjs.com` — `ExceptionFilter`, `ZodValidationPipe`, `HttpAdapterHost`).

---

## 2. Estrutura de Projeto

```
/
├─ apps/
│  ├─ transactions/        # NestJS API 3001 — CRUD + Kafka producer/consumer
│  │  ├─ src/modules/transactions/
│  │  ├─ src/modules/kafka/
│  │  └─ prisma/schema.prisma (ou prisma raiz compartilhado)
│  ├─ anti-fraud/          # NestJS 3002 — consumer created → producer status.updated
│  └─ web/                 # Next.js App Router 3000
│     ├─ app/(dashboard)/page.tsx
│     ├─ app/transactions/[id]/page.tsx
│     ├─ app/transactions/new/page.tsx
│     └─ components/ + lib/api + stores/
├─ packages/
│  ├─ shared/              # Zod schemas + TS types + kafka payload helpers
│  │  └─ src/schemas/transaction.ts
│  ├─ eslint-config/       # flat config compartilhada
│  └─ tsconfig/            # base.json strict
├─ turbo.json
├─ pnpm-workspace.yaml
├─ .husky/ + commitlint.config.cjs
├─ docker-compose.yml (existente)
├─ .env.example / .env
├─ DECISIONS.md
└─ docs/superpowers/specs/
```

**Alternativas descartadas:**

- _Nx vs Turborepo:_ Nx mais pesado, generators desnecessários para 3 apps; Turborepo entrega cache com config mínima.
- _Repos separados:_ dificulta `shared` e `pnpm quality` único; CI teria que orquestrar 3 repos.
- _pnpm puro sem Turborepo:_ sem cache, `pnpm quality` fica lento e CI repete trabalho.

---

## 3. Fundação — Tooling e Quality Gate

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.
- Paths `@repo/*`, `noImplicitAny`, ban `any` via ESLint `no-explicit-any`.

### Lint / Format / Hooks

- **ESLint flat** + `typescript-eslint`, `eslint-plugin-import`, `eslint-config-prettier` (desliga conflitos). Prettier 3.x.
- **Husky** + `lint-staged`: `pre-commit` roda `eslint --fix` e `prettier --write` só nos staged.
- **commitlint** + `commit-msg` hook: valida Conventional Commits (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`), branch `feat/kebab-case`.

### Quality Gate

```json
// package.json raiz
"scripts": {
  "lint": "turbo run lint",
  "typecheck": "turbo run typecheck",
  "format:check": "prettier --check .",
  "format:write": "prettier --write .",
  "test": "turbo run test -- --run",
  "build": "turbo run build",
  "quality": "turbo run lint typecheck && prettier --check . && turbo run test -- --run && turbo run build"
}
```

- Cada app expõe `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest --run`), `build` (`nest build` / `next build`).
- `turbo.json` pipeline com `dependsOn: ["^build"]` e cache `outputs: ["dist/**", ".next/**"]`.

### CI

`.github/workflows/ci.yml`:

```yaml
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        { image: postgres:16-alpine, env: { POSTGRES_PASSWORD: postgres }, ports: ['5432:5432'] }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm quality
```

Badge verde obrigatório na entrega.

---

## 4. Backend — Modelagem e API

### Prisma

```prisma
// prisma/schema.prisma (raiz ou apps/transactions/prisma)
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum TransactionStatus { PENDING APPROVED REJECTED }

model TransactionType {
  id   Int    @id
  name String @unique
  transactions Transaction[]
}

model Transaction {
  id                      String            @id @default(uuid())
  transactionExternalId   String            @unique @default(uuid())
  accountExternalIdDebit  String
  accountExternalIdCredit String
  transferTypeId          Int
  type                    TransactionType   @relation(fields: [transferTypeId], references: [id])
  value                   Decimal           @db.Decimal(12,2)
  status                  TransactionStatus @default(PENDING)
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt
  @@index([status, createdAt])
  @@index([transferTypeId])
  @@index([createdAt])
}
```

- `transactionExternalId` exposto na API (Guid), `id` interno.
- Seed inicial para `TransactionType` (ex.: 1 = PIX, 2 = TED se necessário, mínimo 1).
- Migrations versionadas (`prisma migrate dev`).

**Alternativas:** `status` como tabela lookup vs enum — enum vence por 3 valores fixos de regra de negócio; `type` como tabela permite evoluir sem deploy.

### Contratos

```ts
// packages/shared/src/schemas/transaction.ts
import { z } from 'zod';
export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int().positive(),
  value: z.number().positive().max(9999999999),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export const transactionCreatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(),
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int(),
  value: z.number(),
  createdAt: z.string().datetime(),
});
export const transactionStatusUpdatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  evaluatedAt: z.string().datetime(),
});
```

### Endpoints (Transactions service — NestJS)

- `POST /transactions` → 201 `{ transactionExternalId, transactionType: { name }, transactionStatus: { name: "PENDING" }, value, createdAt }` + publica `transaction.created` (key=externalId, acks=all).
- `GET /transactions/:externalId` → 200 ou 404 `{ statusCode, message }` padronizado.
- `GET /transactions?page=1&limit=10&status=PENDING&type=1&from=2026-01-01&to=2026-08-26` → `{ data: [...], meta: { page, limit, total, totalPages } }`.

### Validação e Erros (Context7 Nest)

- `ZodValidationPipe implements PipeTransform` — `schema.parse` → `BadRequestException({ message: "Validation failed", errors: zod.flatten })`.
- Hierarquia: `DomainException extends HttpException`, `TransactionNotFoundException extends NotFoundException`, `ValidationException extends BadRequestException` com `errors: [{ field, message }]`.
- Filtros globais:
  ```ts
  @Catch(HttpException) class HttpExceptionFilter implements ExceptionFilter { catch(e, host){ ... status, timestamp, path } }
  @Catch() class CatchEverythingFilter implements ExceptionFilter { constructor(private httpAdapterHost: HttpAdapterHost){} catch(e, host){ const status = e instanceof HttpException ? e.getStatus() : 500; httpAdapter.reply(...) } }
  ```
- `APP_FILTER` global + `APP_PIPE` se necessário, logs pino com `requestId`.

### Kafka

- **Cliente:** `kafkajs` (leve, suporta KRaft, retry/DLQ nativo; validado vs `confluent-kafka` que exige librdkafka).
- **Tópicos:** `transaction.created` (produzido por transactions, consumido por anti-fraud, partitions=3, key=externalId), `transaction.status.updated` (produzido por anti-fraud, consumido por transactions).
- **Grupos:** `KAFKA_GROUP_ID_TRANSACTIONS`, `KAFKA_GROUP_ID_ANTI_FRAUD` via env.
- **Semântica:** at-least-once + **idempotência**: `UPDATE transactions SET status=$1 WHERE externalId=$2 AND status='PENDING'` (se já aprovado/rejeitado, no-op). `externalId` único garante deduplicação. DLQ `transaction.*.dlq` para poison messages (após 3 retries com backoff exponencial).
- **Regra antifraude:** `value > 1000 → REJECTED else APPROVED` — pura, testável, sem I/O.
- **Outbox:** avaliado como evolução (tabela `OutboxEvent` + poller) para garantir atomicidade DB+Kafka; para o desafio, publish direto com log e retry é suficiente, documentado em `DECISIONS.md`.

---

## 5. Frontend — Dashboard

### Stack

- Next.js 15 (App Router, `fetch` com `cache: no-store` para server components se necessário), React 19, Tailwind 4, `react-hook-form` + `zodResolver`, `date-fns`.

### Rotas

- `/` — Dashboard: filtros (status, tipo, período), tabela paginada, paginação.
- `/transactions/[externalId]` — Detalhe: `GET /transactions/:id`.
- `/transactions/new` — Form criação.

### Data Layer (Context7 TanStack Query)

```ts
// lib/api/transactions.ts
export const useTransactions = (filters) =>
  useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetch(`/api/transactions?${qs.stringify(filters)}`).then((r) => r.json()),
    refetchInterval: (query) => {
      const hasPending = (query.state.data as any)?.data?.some(
        (t) => t.transactionStatus.name === 'PENDING',
      );
      return hasPending ? 3000 : false;
    },
    refetchIntervalInBackground: false,
    retry: 1,
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionDto) =>
      fetch('/api/transactions', { method: 'POST', body: JSON.stringify(dto) }).then((r) => {
        if (!r.ok) throw r;
        return r.json();
      }),
    onMutate: async (newTx) => {
      await qc.cancelQueries({ queryKey: ['transactions'] });
      const prev = qc.getQueryData(['transactions']);
      qc.setQueryData(['transactions'], (old: any) => ({
        ...old,
        data: [{ ...newTx, transactionStatus: { name: 'PENDING' } }, ...old.data],
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['transactions'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
};
```

- `refetchInterval` dinâmico validado em Context7 — pausa quando não há pendentes.
- Alternativas SSE/WebSocket descartadas: exigem manter conexão server-side, volume pendente baixo não justifica custo.

### Estado Cliente (Context7 Zustand)

```ts
// stores/filter-store.ts
import { create } from 'zustand';
type Filters = {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};
export const useFilterStore = create<Filters & { set: (p: Partial<Filters>) => void }>((set) => ({
  page: 1,
  limit: 10,
  set: (p) => set(p),
}));
```

- Redux Toolkit descartado: `configureStore` + `createSlice` + Immer = boilerplate para estado de filtros/paginação; Zustand é hook simples, sem provider obrigatório, compatível com Next.js via context se necessário (docs Zustand).

### UI / Acessibilidade

- Estados: `isLoading` → `<div role="status" aria-live="polite">Carregando...</div>` skeleton; `isError` → `<div role="alert">` + botão Retry; `data.length===0` → empty com CTA "Criar transação".
- Form: `useForm({ resolver: zodResolver(createTransactionSchema) })`, erros por campo, `aria-invalid`, `aria-describedby`.
- `StatusBadge` com cores (amarelo pendente, verde aprovado, vermelho rejeitado).

---

## 6. Testes

### Backend (Vitest)

- **Unit:** regra `value > 1000` (casos 1000, 1000.01, 999.99), `ZodValidationPipe`, `TransactionService`, `AntiFraudService`.
- **Integração:** `Test.createTestingModule` + Prisma Testcontainers (`@testcontainers/postgresql`) + Kafka mock (`kafkajs` mock ou `testcontainers/kafka`), testa fluxo `POST → emit created → consume → emit updated → consume → status`.
- **Critério:** comportamento, não implementação; `getByRole` não aplica ao backend.

### Frontend (Vitest + Testing Library + Playwright)

- **Unit/Component:** listagem com filtros, estados loading/error/empty via `getByRole`, detalhe, form validação (zod), `StatusBadge`.
- **E2E (Playwright):** `POST /transactions` → lista mostra PENDING → após ~3s muda para APPROVED/REJECTED (mock Kafka ou aguarda real).
- Todos rodam em `pnpm test` e `pnpm quality`; CI roda mesmo comando.

---

## 7. DECISIONS.md — Estrutura

Cada decisão segue formato `PRACTICES.md`:

```md
## <Título>

**Decisão:** ...
**Alternativas consideradas:** ...
**Por quê:** ...
```

Decisões obrigatórias:

1. Monorepo Turborepo vs Nx vs repos separados
2. Modelagem (enum vs lookup, externalId vs id)
3. Formato eventos (JSON + Zod, key=externalId)
4. Tratamento falha mensageria (at-least-once + idempotência + DLQ vs outbox vs exactly-once)
5. Atualização status na UI (polling dinâmico 3s vs SSE vs WebSocket)
6. Estratégia testes (Vitest + Testing Library `getByRole` vs data-testid)
7. Runtime Node 24 LTS vs 22 (segurança, compatibilidade, LTS)
8. Resposta alta concorrência (ver seção 8)

---

## 8. Alta Concorrência — Como abordar (sem implementar)

**Pergunta do README:** lidar com volume alto de escritas/leituras concorrentes.

**Abordagem defendida:**

- **Escrita:** idempotência por `transactionExternalId` (unique + key Kafka) → `INSERT ... ON CONFLICT DO NOTHING` ou `UPDATE WHERE status=PENDING`; partição Kafka por externalId garante ordem por transação; retry com backoff + DLQ evita poison blocking; réplicas stateless de `transactions`/`anti-fraud` atrás de LB, cada consumer group escala horizontalmente (até nº partições).
- **Leitura:** índices `status+createdAt`, paginação por cursor (`createdAt + id`) para evitar `OFFSET` caro; para escala, read replica Postgres + cache Redis para `GET /transactions` (TTL curto, invalida em `status.updated`); CDN para assets Next.
- **Evolução:** Outbox pattern (tabela + poller + transactional outbox) para atomicidade DB+Kafka sem 2PC; para exactly-once, Kafka transactions (idempotent producer + `transactional.id`), mas custo não justifica volume inicial.
- **Observabilidade:** métricas `kafka_consumer_lag`, `http_request_duration`, `db_pool`, traces OpenTelemetry, alertas em lag > threshold.

**Alternativas descartadas:** Event sourcing puro (complexo, exige replay), sharding prematuro, WebSocket para atualização (stateful, dificulta escala).

---

## 9. Sequência de Implementação (feature-by-feature)

1. **Fundação** (`feat/fundacao-projeto`): monorepo, shared, eslint, husky, commitlint, turbo, `pnpm quality`, CI verde, Prisma init + `.env` validado.
2. **Transações criação/recuperação** (`feat/criacao-e-consulta-transacao`): Nest `POST/GET`, Prisma, Zod pipe, Exception Filters, `@repo/shared`, testes unit/integração, DLQ esqueleto.
3. **Antifraude + retorno** (`feat/fluxo-antifraude-kafka`): Nest anti-fraud, regra >1000, producers/consumers kafkajs, testes fluxo assíncrono.
4. **Listagem paginada** (`feat/listagem-paginada`): `GET /transactions` com filtros, índices, testes paginação.
5. **Frontend dashboard** (`feat/dashboard-listagem` → `feat/dashboard-detalhe` → `feat/dashboard-criacao`): Next + Tailwind + Query + Zustand, estados loading/error/empty, form, polling dinâmico, testes RTL/Playwright.
6. **Polimento** (`docs/decisoes-e-readme`): `DECISIONS.md` completo, README substituto (como rodar `cp .env.example .env && docker compose up -d && pnpm install && pnpm dev`), checklist PR.

Cada slice: `pnpm quality` local + testes manuais → push → PR para `develop` (template preenchido) → CI verde → merge manual pelo revisor.

---

## 10. Riscos e Mitigações

- **Kafka indisponível no boot:** healthcheck `docker-compose`, `retry` com backoff no producer, fila em memória limitada (descarta com log se estourar).
- **Drift de contrato:** `@repo/shared` como single source of truth, CI quebra se schema não compila.
- **Polling sobrecarrega API:** intervalo 3s só com pendentes, backoff para 5s em erro (`refetchInterval: (q)=> q.state.status==='error'?5000:3000` — Context7).
- **Testes flaky com Kafka:** mock para unit, Testcontainers para integração, `await` em `waitFor` ao invés de `sleep`.

---

## 11. Referências Context7

- `/tanstack/query` — polling dinâmico, optimistic updates
- `/pmndrs/zustand` — comparação Redux Toolkit, Next.js provider
- `/nestjs/docs.nestjs.com` — ExceptionFilter, ZodValidationPipe, HttpAdapterHost
- `/benlorantfy/nestjs-zod` — validação Zod em Nest (benchmark 92.58, alternativa considerada)
- `/prisma/docs` (a consultar na implementação) — Decimal, índices, migrations
- `/confluentinc/kafka` (a consultar) — KRaft, acks, idempotência

---

_Fim do design. Próximo passo: `writing-plans` para decompor em tasks verificáveis e gerar plano de implementação por slice._
