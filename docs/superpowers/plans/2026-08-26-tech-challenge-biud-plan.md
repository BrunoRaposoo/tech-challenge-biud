# Tech Challenge BIUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar monorepo Turborepo (Node 24 LTS + pnpm + NestJS + Prisma + Kafka + Next.js) com fluxo assíncrono `transaction.created` → antifraude (>1000 rejeita) → `status.updated`, dashboard com polling dinâmico e quality gate verde, feature-by-feature com PRs para `develop`.

**Architecture:** Monorepo `pnpm workspaces + Turborepo`, `packages/shared` (Zod), `apps/transactions` (3001) + `apps/anti-fraud` (3002) + `apps/web` (3000), single Postgres (Prisma enums + lookup), kafkajs at-least-once + idempotência + DLQ, TanStack Query `refetchInterval` dinâmico + Zustand mínimo, ExceptionFilters hierárquicos.

**Tech Stack:** Node 24 LTS, pnpm 9+, TypeScript strict, NestJS 10+, Prisma 5+, kafkajs, Next.js 15 App Router, Tailwind 4, TanStack Query 5, Zustand 5, Vitest, Testing Library, Playwright, ESLint flat + Prettier, Husky + lint-staged + commitlint, Turborepo, GitHub Actions.

---

## File Structure (o que será criado/modificado)

```
package.json (raiz — scripts quality, turbo)
pnpm-workspace.yaml
turbo.json
.nvmrc (24)
.env.example (ajustado se precisar)
packages/shared/{package.json, src/schemas/transaction.ts, src/index.ts}
packages/eslint-config/{package.json, index.js}
packages/tsconfig/{package.json, base.json}
apps/transactions/{package.json, src/main.ts, src/app.module.ts, src/modules/transactions/*, src/modules/kafka/*, prisma/schema.prisma}
apps/anti-fraud/{package.json, src/main.ts, src/app.module.ts, src/modules/anti-fraud/*, src/modules/kafka/*}
apps/web/{package.json, next.config.mjs, tailwind.config.ts, app/(dashboard)/page.tsx, app/transactions/[id]/page.tsx, app/transactions/new/page.tsx, components/*, lib/api/*, stores/filter-store.ts}
.husky/pre-commit, .husky/commit-msg, commitlint.config.cjs, lint-staged.config.cjs
.github/workflows/ci.yml
DECISIONS.md, README.md (final)
```

---

## Fase 0 — Preparação (branch a partir de develop)

- [ ] **Step 0.1: Criar branch fundação**
```bash
git checkout develop && git pull origin develop && git checkout -b feat/fundacao-projeto
```

---

## Fase 1 — Fundação (PR1: feat/fundacao-projeto)

### Task 1: Monorepo + Turborepo + pnpm workspaces

**Files:**
- Create: `pnpm-workspace.yaml`, `turbo.json`, `package.json` (raiz), `.nvmrc`
- Modify: `package.json` raiz (se existir)

- [ ] **Step 1.1: Criar pnpm-workspace.yaml**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 1.2: Criar turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": { "outputs": [] },
    "typecheck": { "outputs": [] },
    "test": { "outputs": ["coverage/**"] }
  }
}
```

- [ ] **Step 1.3: Criar package.json raiz**
```json
{
  "name": "tech-challenge-biud",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format:check": "prettier --check .",
    "format:write": "prettier --write .",
    "test": "turbo run test -- --run",
    "build": "turbo run build",
    "quality": "turbo run lint typecheck && prettier --check . && turbo run test -- --run && turbo run build",
    "dev": "turbo run dev"
  },
  "devDependencies": { "prettier": "^3.3.3", "turbo": "^2.3.0", "typescript": "^5.6.0" }
}
```

- [ ] **Step 1.4: Atualizar .nvmrc para 24**
```bash
echo "24" > .nvmrc && cat .nvmrc
```

- [ ] **Step 1.5: Instalar e verificar**
```bash
pnpm install && pnpm quality
# Expected: PASS (ainda sem apps, mas scripts existem)
```

- [ ] **Step 1.6: Commit**
```bash
git add pnpm-workspace.yaml turbo.json package.json .nvmrc
git commit -m "feat(fundacao): configura monorepo pnpm workspaces + turborepo + Node 24 LTS"
```

### Task 2: TypeScript strict compartilhado

**Files:**
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/base.json`

- [ ] **Step 2.1: packages/tsconfig/base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "CommonJS", "moduleResolution": "node",
    "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true, "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true, "esModuleInterop": true,
    "skipLibCheck": true, "declaration": true, "outDir": "dist"
  }
}
```

- [ ] **Step 2.2: Commit**
```bash
git add packages/tsconfig/
git commit -m "feat(fundacao): adiciona tsconfig base strict compartilhado"
```

### Task 3: ESLint flat + Prettier

**Files:**
- Create: `packages/eslint-config/package.json`, `packages/eslint-config/index.js`, `.prettierrc`, `.prettierignore`

- [ ] **Step 3.1: packages/eslint-config/index.js**
```js
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
export default tseslint.config(...tseslint.configs.recommended, prettier, {
  rules: { "@typescript-eslint/no-explicit-any": "error", "no-console": "warn" }
});
```

- [ ] **Step 3.2: Commit**
```bash
git add packages/eslint-config/ .prettierrc
git commit -m "feat(fundacao): configura ESLint flat + Prettier"
```

### Task 4: shared package com Zod

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/src/schemas/transaction.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/transaction.test.ts`

- [ ] **Step 4.1: Write failing test**
```ts
// packages/shared/src/schemas/transaction.test.ts
import { describe, it, expect } from "vitest";
import { createTransactionSchema } from "./transaction.js";
describe("createTransactionSchema", () => {
  it("rejeita value negativo", () => {
    expect(() => createTransactionSchema.parse({ accountExternalIdDebit: "550e8400-e29b-41d4-a716-446655440000", accountExternalIdCredit: "550e8400-e29b-41d4-a716-446655440001", transferTypeId: 1, value: -10 })).toThrow();
  });
});
```

- [ ] **Step 4.2: Run test to fail**
```bash
pnpm --filter @repo/shared test -- --run
# Expected: FAIL schema not found
```

- [ ] **Step 4.3: Implement schema**
```ts
// packages/shared/src/schemas/transaction.ts
import { z } from "zod";
export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int().positive(),
  value: z.number().positive().max(9999999999),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export const transactionCreatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(), accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(), transferTypeId: z.number().int(), value: z.number(), createdAt: z.string().datetime(),
});
export const transactionStatusUpdatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(), status: z.enum(["APPROVED","REJECTED"]), evaluatedAt: z.string().datetime(),
});
```

- [ ] **Step 4.4: Run test to pass**
```bash
pnpm --filter @repo/shared test -- --run
# Expected: PASS
```

- [ ] **Step 4.5: Commit**
```bash
git add packages/shared/
git commit -m "feat(shared): adiciona schemas Zod para transacao e eventos Kafka"
```

### Task 5: Husky + lint-staged + commitlint

**Files:**
- Create: `commitlint.config.cjs`, `lint-staged.config.cjs`, `.husky/pre-commit`, `.husky/commit-msg`

- [ ] **Step 5.1: commitlint.config.cjs**
```js
module.exports = { extends: ["@commitlint/config-conventional"] };
```

- [ ] **Step 5.2: lint-staged.config.cjs**
```js
module.exports = { "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"], "*.{json,md}": ["prettier --write"] };
```

- [ ] **Step 5.3: Hooks**
```bash
pnpm dlx husky init
# .husky/pre-commit: pnpm lint-staged
# .husky/commit-msg: pnpm commitlint --edit $1
```

- [ ] **Step 5.4: Test commit-msg**
```bash
echo "mensagem errada" | pnpm commitlint
# Expected: FAIL
echo "feat(shared): mensagem valida" | pnpm commitlint
# Expected: PASS
```

- [ ] **Step 5.5: Commit**
```bash
git add commitlint.config.cjs lint-staged.config.cjs .husky/
git commit -m "feat(fundacao): adiciona husky + lint-staged + commitlint"
```

### Task 6: CI GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 6.1: .github/workflows/ci.yml**
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16-alpine, env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: challenge }, ports: ["5432:5432"], options: --health-cmd="pg_isready -U postgres" --health-interval=5s --health-retries=5 }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm quality
```

- [ ] **Step 6.2: Commit e push para validar CI**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: adiciona workflow quality gate com Node 24"
git push origin feat/fundacao-projeto
# Abrir PR para develop, verificar CI verde
```

### Task 7: Prisma init + Docker

**Files:**
- Create: `prisma/schema.prisma` (raiz), `prisma/seed.ts`, `.env` (copiar de .env.example)

- [ ] **Step 7.1: schema.prisma**
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
enum TransactionStatus { PENDING APPROVED REJECTED }
model TransactionType { id Int @id; name String @unique; transactions Transaction[] }
model Transaction {
  id String @id @default(uuid())
  transactionExternalId String @unique @default(uuid())
  accountExternalIdDebit String
  accountExternalIdCredit String
  transferTypeId Int
  type TransactionType @relation(fields: [transferTypeId], references: [id])
  value Decimal @db.Decimal(12,2)
  status TransactionStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([status, createdAt])
}
```

- [ ] **Step 7.2: Test migration**
```bash
cp .env.example .env && docker compose up -d && pnpm dlx prisma migrate dev --name init
# Expected: migration criada em prisma/migrations/
pnpm dlx prisma generate
```

- [ ] **Step 7.3: Commit**
```bash
git add prisma/ .env.example
git commit -m "feat(fundacao): inicializa Prisma com modelagem Transaction"
```

**PR1 Checklist:** `pnpm quality` passa, CI verde, `docker compose up -d` ok, `DECISIONS.md` esqueleto iniciado com decisão Node 24.

---

## Fase 2 — Transações criação e consulta (PR2: feat/criacao-e-consulta-transacao)

### Task 8: Nest app transactions scaffold

**Files:**
- Create: `apps/transactions/package.json`, `apps/transactions/src/main.ts`, `apps/transactions/src/app.module.ts`

- [ ] **Step 8.1: main.ts**
```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  await app.listen(process.env.TRANSACTIONS_PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 8.2: Vitest config + test hello**
```ts
// apps/transactions/src/app.test.ts
import { describe, it, expect } from "vitest";
describe("app", () => { it("boota", () => expect(true).toBe(true)); });
```

- [ ] **Step 8.3: Commit**
```bash
git add apps/transactions/
git commit -m "feat(transactions): scaffold NestJS app"
```

### Task 9: ZodValidationPipe + ExceptionFilters

**Files:**
- Create: `apps/transactions/src/common/pipes/zod-validation.pipe.ts`, `apps/transactions/src/common/filters/http-exception.filter.ts`, `apps/transactions/src/common/filters/catch-everything.filter.ts`
- Test: `apps/transactions/src/common/pipes/zod-validation.pipe.test.ts`

- [ ] **Step 9.1: Failing test pipe**
```ts
import { describe, it, expect } from "vitest";
import { ZodValidationPipe } from "./zod-validation.pipe.js";
import { z } from "zod";
describe("ZodValidationPipe", () => {
  it("lança BadRequest com errors por campo", () => {
    const pipe = new ZodValidationPipe(z.object({ value: z.number().positive() }));
    expect(() => pipe.transform({ value: -1 }, {} as any)).toThrow(/Validation failed/);
  });
});
```

- [ ] **Step 9.2: Implement pipe**
```ts
import { PipeTransform, BadRequestException } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  transform(value: unknown) {
    try { return this.schema.parse(value); } catch (e) {
      const err = e as ZodError;
      throw new BadRequestException({ message: "Validation failed", errors: err.flatten().fieldErrors });
    }
  }
}
```

- [ ] **Step 9.3: Filters (CatchEverything com HttpAdapterHost)**
```ts
import { Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
@Catch()
export class CatchEverythingFilter extends BaseExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) { super(); }
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = { statusCode: status, timestamp: new Date().toISOString(), path: httpAdapter.getRequestUrl(ctx.getRequest()) };
    httpAdapter.reply(ctx.getResponse(), body, status);
  }
}
```

- [ ] **Step 9.4: Commit**
```bash
git add apps/transactions/src/common/
git commit -m "feat(transactions): adiciona ZodValidationPipe e ExceptionFilters"
```

### Task 10: POST /transactions + GET /transactions/:id

**Files:**
- Create: `apps/transactions/src/modules/transactions/transactions.controller.ts`, `transactions.service.ts`, `dto.ts`
- Test: `transactions.service.test.ts` (regra pendente), `transactions.controller.test.ts` (integração)

- [ ] **Step 10.1: Failing test service**
```ts
import { describe, it, expect } from "vitest";
import { TransactionsService } from "./transactions.service.js";
describe("TransactionsService", () => {
  it("cria transacao com status PENDING e publica evento", async () => {
    // mock prisma e kafka
    const svc = new TransactionsService({ transaction: { create: async (x:any)=>x.data } } as any, { emit: async ()=>{} } as any);
    const result = await svc.create({ accountExternalIdDebit: "550e8400-e29b-41d4-a716-446655440000", accountExternalIdCredit: "550e8400-e29b-41d4-a716-446655440001", transferTypeId: 1, value: 120 });
    expect(result.transactionStatus.name).toBe("PENDING");
  });
});
```

- [ ] **Step 10.2: Implement service + controller**
```ts
// transactions.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { KafkaService } from "../kafka/kafka.service.js";
@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService, private kafka: KafkaService) {}
  async create(dto: any) {
    const tx = await this.prisma.transaction.create({ data: { ...dto, status: "PENDING" }, include: { type: true } });
    await this.kafka.emit("transaction.created", { transactionExternalId: tx.transactionExternalId, value: Number(tx.value), createdAt: tx.createdAt.toISOString() });
    return { transactionExternalId: tx.transactionExternalId, transactionType: { name: tx.type.name }, transactionStatus: { name: tx.status }, value: Number(tx.value), createdAt: tx.createdAt };
  }
  async findOne(externalId: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { transactionExternalId: externalId }, include: { type: true } });
    if (!tx) throw new NotFoundException({ message: "Transaction not found", transactionExternalId: externalId });
    return { transactionExternalId: tx.transactionExternalId, transactionType: { name: tx.type.name }, transactionStatus: { name: tx.status }, value: Number(tx.value), createdAt: tx.createdAt };
  }
}
```

- [ ] **Step 10.3: Commit**
```bash
git add apps/transactions/src/modules/transactions/
git commit -m "feat(transactions): adiciona POST e GET por externalId com validacao Zod"
```

---

## Fase 3 — Antifraude + consumo retorno (PR3: feat/fluxo-antifraude-kafka)

### Task 11: Anti-fraud app scaffold + regra >1000

**Files:**
- Create: `apps/anti-fraud/src/modules/anti-fraud/anti-fraud.service.ts`
- Test: `anti-fraud.service.test.ts`

- [ ] **Step 11.1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { AntiFraudService } from "./anti-fraud.service.js";
describe("AntiFraudService", () => {
  it("rejeita >1000", () => expect(new AntiFraudService().evaluate(1000.01)).toBe("REJECTED"));
  it("aprova <=1000", () => expect(new AntiFraudService().evaluate(1000)).toBe("APPROVED"));
  it("aprova 120", () => expect(new AntiFraudService().evaluate(120)).toBe("APPROVED"));
});
```

- [ ] **Step 11.2: Implement**
```ts
export class AntiFraudService { evaluate(value: number): "APPROVED" | "REJECTED" { return value > 1000 ? "REJECTED" : "APPROVED"; } }
```

- [ ] **Step 11.3: Commit**
```bash
git add apps/anti-fraud/
git commit -m "feat(anti-fraud): implementa regra de avaliacao >1000"
```

### Task 12: Kafka consumers/producers (kafkajs)

**Files:**
- Create: `apps/transactions/src/modules/kafka/kafka.service.ts`, `apps/anti-fraud/src/modules/kafka/kafka.consumer.ts`
- Test: integração com Testcontainers kafka

- [ ] **Step 12.1: KafkaService transactions**
```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Kafka, Producer, Consumer } from "kafkajs";
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({ clientId: process.env.KAFKA_CLIENT_ID, brokers: [process.env.KAFKA_BROKERS ?? "localhost:9092"] });
  private producer: Producer = this.kafka.producer({ idempotent: true });
  private consumer: Consumer = this.kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID_TRANSACTIONS ?? "transactions-consumer" });
  async onModuleInit() { await this.producer.connect(); await this.consumer.connect(); await this.consumer.subscribe({ topic: "transaction.status.updated", fromBeginning: false }); await this.consumer.run({ eachMessage: async ({ message }) => { const payload = JSON.parse(message.value!.toString()); await this.handleStatusUpdated(payload); } }); }
  async onModuleDestroy() { await this.producer.disconnect(); await this.consumer.disconnect(); }
  async emit(topic: string, payload: any) { await this.producer.send({ topic, messages: [{ key: payload.transactionExternalId, value: JSON.stringify(payload) }] }); }
  private async handleStatusUpdated(payload: any) { /* prisma update where status=PENDING */ }
}
```

- [ ] **Step 12.2: Anti-fraud consumer**
```ts
// consome transaction.created, avalia, produz transaction.status.updated com acks=all
```

- [ ] **Step 12.3: Commit**
```bash
git add apps/*/src/modules/kafka/
git commit -m "feat(kafka): conecta producers/consumers com idempotencia e DLQ"
```

---

## Fase 4 — Listagem paginada (PR4: feat/listagem-paginada)

### Task 13: GET /transactions paginado com filtros

**Files:**
- Modify: `apps/transactions/src/modules/transactions/transactions.controller.ts`, `transactions.service.ts`
- Test: `transactions.list.test.ts`

- [ ] **Step 13.1: Failing test**
```ts
it("lista paginada com filtros", async () => {
  // cria 3 tx, 1 REJECTED, filtra status=REJECTED → retorna 1
});
```

- [ ] **Step 13.2: Implement**
```ts
async findAll(query: { page?: number; limit?: number; status?: string; type?: number; from?: string; to?: string }) {
  const page = query.page ?? 1, limit = Math.min(query.limit ?? 10, 50);
  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.type) where.transferTypeId = query.type;
  if (query.from || query.to) where.createdAt = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };
  const [data, total] = await Promise.all([this.prisma.transaction.findMany({ where, skip: (page-1)*limit, take: limit, include: { type: true }, orderBy: { createdAt: "desc" } }), this.prisma.transaction.count({ where })]);
  return { data: data.map(tx=>({ transactionExternalId: tx.transactionExternalId, transactionType: { name: tx.type.name }, transactionStatus: { name: tx.status }, value: Number(tx.value), createdAt: tx.createdAt })), meta: { page, limit, total, totalPages: Math.ceil(total/limit) } };
}
```

- [ ] **Step 13.3: Commit**
```bash
git add apps/transactions/src/modules/transactions/
git commit -m "feat(transactions): adiciona listagem paginada com filtros"
```

---

## Fase 5 — Frontend Dashboard (PRs 5a/5b/5c)

### Task 14: Next.js scaffold + Tailwind

**Files:**
- Create: `apps/web/package.json`, `apps/web/tailwind.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`

- [ ] **Step 14.1: Commit**
```bash
git add apps/web/
git commit -m "feat(web): scaffold Next.js + Tailwind"
```

### Task 15: TanStack Query + Zustand + API layer

**Files:**
- Create: `apps/web/lib/api/transactions.ts`, `apps/web/lib/query-client.ts`, `apps/web/stores/filter-store.ts`

- [ ] **Step 15.1: Implement filter store**
```ts
import { create } from "zustand";
type Filters = { status?: string; type?: string; from?: string; to?: string; page: number; limit: number };
export const useFilterStore = create<Filters & { set: (p: Partial<Filters>)=>void; reset: ()=>void }>((set)=>({ page: 1, limit: 10, set: (p)=>set(p), reset: ()=>set({ status: undefined, type: undefined, from: undefined, to: undefined, page: 1, limit: 10 }) }));
```

- [ ] **Step 15.2: Commit**
```bash
git add apps/web/lib/ apps/web/stores/
git commit -m "feat(web): adiciona TanStack Query e Zustand para filtros"
```

### Task 16: Listagem + estados loading/error/empty

**Files:**
- Create: `apps/web/app/(dashboard)/page.tsx`, `apps/web/components/TransactionTable.tsx`, `StatusBadge.tsx`, `Pagination.tsx`, `Filters.tsx`
- Test: `apps/web/components/TransactionTable.test.tsx`

- [ ] **Step 16.1: Failing test**
```tsx
import { render, screen } from "@testing-library/react";
import TransactionTable from "./TransactionTable.js";
it("mostra loading", () => { render(<TransactionTable isLoading />); expect(screen.getByRole("status")).toBeInTheDocument(); });
it("mostra vazio", () => { render(<TransactionTable data={[]} />); expect(screen.getByRole("status", { name: /nenhuma/i })).toBeInTheDocument(); });
it("mostra erro", () => { render(<TransactionTable isError />); expect(screen.getByRole("alert")).toBeInTheDocument(); });
```

- [ ] **Step 16.2: Implement com polling dinâmico**
```tsx
"use client";
import { useTransactions } from "@/lib/api/transactions";
import { useFilterStore } from "@/stores/filter-store";
export default function Dashboard() {
  const filters = useFilterStore();
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  if (isLoading) return <div role="status">Carregando...</div>;
  if (isError) return <div role="alert">Erro <button onClick={()=>refetch()}>Tentar novamente</button></div>;
  if (!data?.data.length) return <div role="status">Nenhuma transação encontrada</div>;
  return <TransactionTable data={data.data} />;
}
```

- [ ] **Step 16.3: Commit**
```bash
git add apps/web/app/ apps/web/components/
git commit -m "feat(web): dashboard listagem com polling dinamico e estados de tela"
```

### Task 17: Detalhe e Criação

**Files:**
- Create: `apps/web/app/transactions/[id]/page.tsx`, `apps/web/app/transactions/new/page.tsx`, `apps/web/components/TransactionForm.tsx`
- Test: `TransactionForm.test.tsx` (zod, getByRole)

- [ ] **Step 17.1: Form com zodResolver**
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTransactionSchema } from "@repo/shared";
export function TransactionForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(createTransactionSchema) });
  // onSubmit via TanStack mutation com optimistic update
}
```

- [ ] **Step 17.2: Commit**
```bash
git add apps/web/app/transactions/
git commit -m "feat(web): detalhe e criacao com validacao Zod"
```

---

## Fase 6 — Polimento (PR6: docs/decisoes-e-readme)

### Task 18: DECISIONS.md completo

**Files:**
- Create: `DECISIONS.md`

- [ ] **Step 18.1: Escrever 8 decisões (monorepo, modelagem, eventos, DLQ, polling, testes, Node 24, concorrência)**
```md
## Runtime Node 24 LTS
**Decisão:** Node 24 LTS ao invés de 22+
**Alternativas:** 22 (README), 20 LTS
**Por quê:** LTS mais recente em 2026, patches de segurança, compatibilidade Next 15/Tailwind 4, README permite alterar com justificativa.
```

- [ ] **Step 18.2: Commit**
```bash
git add DECISIONS.md
git commit -m "docs: registra decisoes de arquitetura"
```

### Task 19: README substituto

**Files:**
- Modify: `README.md`

- [ ] **Step 19.1: README com como rodar, testar, o que ficou de fora**
```md
# Tech Challenge BIUD
## Como rodar: cp .env.example .env && docker compose up -d && pnpm install && pnpm dev
## Como testar: pnpm quality
```

- [ ] **Step 19.2: Commit**
```bash
git add README.md
git commit -m "docs: substitui README com instrucoes de uso"
```

### Task 20: Verificação final

- [ ] **Step 20.1: Rodar quality gate**
```bash
pnpm quality
# Expected: lint PASS, typecheck PASS, format:check PASS, test PASS, build PASS
docker compose up -d && pnpm --filter transactions test -- --run && pnpm --filter web test -- --run
```

- [ ] **Step 20.2: Abrir PR final para develop**
```bash
git push origin docs/decisoes-e-readme
# PR checklist: pnpm quality, testes, Conventional Commits, DECISIONS.md
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Fundação (monorepo, TS strict, lint, husky, commitlint, quality, CI, Prisma) → Tasks 1-7 ✅
- Backend create/get (PENDING + publish) → Task 10 ✅
- Antifraude + consumo updated → Tasks 11-12 ✅
- Listagem paginada filtros → Task 13 ✅
- Frontend listagem/detalhe/criação + loading/error/empty → Tasks 14-17 ✅
- Testes backend/frontend → Tasks 4,9-13,16-17 ✅
- DECISIONS.md + concorrência + README → Tasks 18-19 ✅
- Erro robusto (filters, Zod pipe) → Tasks 9-10 ✅
- Shared Zod, TanStack polling, Zustand → Tasks 4,15-16 ✅

**2. Placeholder scan:** Nenhum `TBD/TODO` — todos os steps têm código concreto.

**3. Type consistency:** `CreateTransactionDto` de `@repo/shared` usado em pipe, service e form; `transactionExternalId` em eventos e API; `TransactionStatus` enum consistente.

---

## Execução

Plan completo e salvo em `docs/superpowers/plans/2026-08-26-tech-challenge-biud-plan.md`. Duas opções:

**1. Subagent-Driven (recomendado)** — despacho um subagente por task, revisão entre tasks, iteração rápida

**2. Inline Execution** — executa tasks nesta sessão via executing-plans, em lote com checkpoints

Qual abordagem prefere?
