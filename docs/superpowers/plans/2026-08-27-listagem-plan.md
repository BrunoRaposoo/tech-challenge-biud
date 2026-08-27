# Listagem Paginada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar `GET /api/transactions` paginado com filtros `status`, `type`, `from`/`to`, validação Zod, Prisma `skip/take` + `count`, `orderBy createdAt DESC`, `meta` com `totalPages`, e Swagger, para alimentar o dashboard.

**Architecture:** `listTransactionsQuerySchema` em `@repo/shared` (Zod `coerce` + `enum` + `datetime` + `refine`), `ZodValidationPipe` no `controller` query, `Prisma` `findMany`/`count` paralelo com `where` dinâmico e índices `status+createdAt`, `Swagger` `@ApiQuery`/`@ApiResponse`.

**Tech Stack:** Node 24 LTS, pnpm, NestJS 10, Prisma 5, Zod 3, @nestjs/swagger 7, Vitest 2, TypeScript strict.

---

## File Structure

```
packages/shared/
  src/schemas/transaction.ts (adiciona listTransactionsQuerySchema)
  src/schemas/transaction.test.ts (novos testes)
apps/transactions/
  src/modules/transactions/transactions.service.ts (adiciona findAll)
  src/modules/transactions/transactions.service.spec.ts (novos testes)
  src/modules/transactions/transactions.controller.ts (adiciona GET paginado)
  src/modules/transactions/transactions.controller.spec.ts (novos testes)
  src/modules/transactions/dto/list-transactions.dto.ts (opcional, se usar createZodDto)
```

---

### Task 1: Zod schema para query em @repo/shared

**Files:**

- Modify: `packages/shared/src/schemas/transaction.ts`
- Modify: `packages/shared/src/schemas/transaction.test.ts`
- Test: `packages/shared/src/schemas/transaction.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/shared/src/schemas/transaction.test.ts
import { describe, it, expect } from 'vitest';
import { listTransactionsQuerySchema } from './transaction.js';
describe('listTransactionsQuerySchema', () => {
  it('page default 1, limit default 10', () => {
    const parsed = listTransactionsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });
  it('rejeita status invalido', () => {
    expect(() => listTransactionsQuerySchema.parse({ status: 'INVALID' })).toThrow();
  });
  it('coerce type string para number', () => {
    const parsed = listTransactionsQuerySchema.parse({ type: '1' });
    expect(parsed.type).toBe(1);
  });
  it('rejeita from > to', () => {
    expect(() =>
      listTransactionsQuerySchema.parse({
        from: '2026-08-27T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
  it('rejeita limit >50', () => {
    expect(() => listTransactionsQuerySchema.parse({ limit: 100 })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to fail**

```bash
pnpm --filter @repo/shared test -- --run src/schemas/transaction.test.ts
# Expected: FAIL — listTransactionsQuerySchema not defined
```

- [ ] **Step 3: Implement schema**

```ts
// packages/shared/src/schemas/transaction.ts — adicionar após transactionStatusUpdatedEventSchema
export const listTransactionsQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    type: z.coerce.number().int().positive().optional(),
    from: z.string().datetime({ message: 'from deve ser ISO datetime' }).optional(),
    to: z.string().datetime({ message: 'to deve ser ISO datetime' }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((data) => !data.from || !data.to || new Date(data.from) <= new Date(data.to), {
    message: 'from deve ser <= to',
    path: ['from'],
  });
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
```

- [ ] **Step 4: Run test to pass**

```bash
pnpm --filter @repo/shared test -- --run src/schemas/transaction.test.ts
# Expected: PASS 5/5
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/transaction.ts packages/shared/src/schemas/transaction.test.ts
git commit -m "feat(shared): adiciona listTransactionsQuerySchema com coerce e refine"
```

---

### Task 2: Prisma findAll com paginação e meta

**Files:**

- Modify: `apps/transactions/src/modules/transactions/transactions.service.ts`
- Create: `apps/transactions/src/modules/transactions/transactions.service.findAll.spec.ts`
- Test: `apps/transactions/src/modules/transactions/transactions.service.findAll.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
// transactions.service.findAll.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { TransactionsService } from './transactions.service.js';
describe('TransactionsService.findAll', () => {
  it('monta where com status/type/from/to e skip/take', async () => {
    const prisma = {
      transaction: {
        findMany: vi.fn().mockResolvedValue([
          {
            transactionExternalId: 'x',
            value: 120,
            status: 'PENDING',
            createdAt: new Date(),
            type: { name: 'PIX' },
          },
        ]),
        count: vi.fn().mockResolvedValue(20),
      },
    } as any;
    const svc = new TransactionsService(prisma, { emitCreated: async () => {} } as any);
    const result = await svc.findAll({
      status: 'PENDING',
      type: 1,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-08-27T00:00:00.000Z',
      page: 2,
      limit: 10,
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING', transferTypeId: 1 }),
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 20,
      totalPages: 2,
      hasNext: false,
      hasPrev: true,
    });
    expect(result.data[0].transactionStatus.name).toBe('PENDING');
  });
  it('sem filtros retorna tudo com page 1', async () => {
    const prisma = {
      transaction: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    } as any;
    const svc = new TransactionsService(prisma, {} as any);
    const result = await svc.findAll({ page: 1, limit: 10 });
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(1);
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
pnpm --filter @repo/transactions test -- --run src/modules/transactions/transactions.service.findAll.spec.ts
# Expected: FAIL — findAll not defined
```

- [ ] **Step 3: Implement findAll**

```ts
// transactions.service.ts — adicionar import ListTransactionsQuery e método
import { ListTransactionsQuery } from '@repo/shared';
import { Prisma } from '@prisma/client';
// ...
async findAll(q: ListTransactionsQuery) {
  const where: Prisma.TransactionWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.type) where.transferTypeId = q.type;
  if (q.from || q.to) where.createdAt = {
    gte: q.from ? new Date(q.from) : undefined,
    lte: q.to ? new Date(q.to) : undefined,
  };
  const [data, total] = await Promise.all([
    this.prisma.transaction.findMany({
      where,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { type: true },
    }),
    this.prisma.transaction.count({ where }),
  ]);
  const totalPages = Math.ceil(total / q.limit) || 1;
  return {
    data: data.map(tx => ({
      transactionExternalId: tx.transactionExternalId,
      transactionType: { name: tx.type.name },
      transactionStatus: { name: tx.status },
      value: Number(tx.value),
      createdAt: tx.createdAt,
    })),
    meta: { page: q.page, limit: q.limit, total, totalPages, hasNext: q.page < totalPages, hasPrev: q.page > 1 },
  };
}
```

- [ ] **Step 4: Run to pass**

```bash
pnpm --filter @repo/transactions test -- --run src/modules/transactions/transactions.service.findAll.spec.ts
# Expected: PASS 2/2
```

- [ ] **Step 5: Commit**

```bash
git add apps/transactions/src/modules/transactions/transactions.service.ts apps/transactions/src/modules/transactions/transactions.service.findAll.spec.ts
git commit -m "feat(transactions): adiciona findAll paginado com meta"
```

---

### Task 3: Controller GET paginado com Swagger e Zod pipe

**Files:**

- Modify: `apps/transactions/src/modules/transactions/transactions.controller.ts`
- Create: `apps/transactions/src/modules/transactions/transactions.controller.list.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
// transactions.controller.list.spec.ts
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
describe('TransactionsController.findAll', () => {
  it('delega para service com query', async () => {
    const mockService = {
      findAll: async (q: any) => ({
        data: [],
        meta: {
          page: q.page,
          limit: q.limit,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
    } as any;
    const mod = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    }).compile();
    const ctrl = mod.get(TransactionsController);
    const result = await ctrl.findAll({ page: 1, limit: 10 });
    expect(result.meta.page).toBe(1);
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
pnpm --filter @repo/transactions test -- --run src/modules/transactions/transactions.controller.list.spec.ts
# Expected: FAIL — findAll not defined
```

- [ ] **Step 3: Implement controller**

```ts
// transactions.controller.ts — adicionar imports e método
import { Get, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { listTransactionsQuerySchema, ListTransactionsQuery } from '@repo/shared';

// ...
@Get()
@ApiOperation({ summary: 'Lista transações paginada', description: 'Filtros por status, type e período (createdAt). Alimenta o dashboard.' })
@ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
@ApiQuery({ name: 'type', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01T00:00:00.000Z' })
@ApiQuery({ name: 'to', required: false, type: String, example: '2026-08-27T00:00:00.000Z' })
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
@ApiResponse({ status: 200, description: 'Lista paginada', schema: { example: { data: [{ transactionExternalId: '...', transactionType:{name:'PIX'}, transactionStatus:{name:'PENDING'}, value:120, createdAt:'2026-08-27T00:00:00.000Z' }], meta:{ page:1, limit:10, total:20, totalPages:2, hasNext:true, hasPrev:false } } } })
@ApiResponse({ status: 400, description: 'Validation failed com errors por campo' })
@UsePipes(new ZodValidationPipe(listTransactionsQuerySchema))
async findAll(@Query() query: ListTransactionsQuery) {
  return this.service.findAll(query);
}
```

- [ ] **Step 4: Run to pass**

```bash
pnpm --filter @repo/transactions test -- --run src/modules/transactions/transactions.controller.list.spec.ts
# Expected: PASS
pnpm turbo run typecheck --force # deve passar com shared build
```

- [ ] **Step 5: Commit**

```bash
git add apps/transactions/src/modules/transactions/transactions.controller.ts apps/transactions/src/modules/transactions/transactions.controller.list.spec.ts
git commit -m "feat(transactions): adiciona GET paginado com Swagger e Zod pipe"
```

---

### Task 4: Verificação quality + dev + Swagger

**Files:** none

- [ ] **Step 1: Build shared**

```bash
pnpm --filter @repo/shared build
# Expected: tsc → dist
```

- [ ] **Step 2: pnpm quality**

```bash
pnpm quality
# Expected: lint, typecheck (dependsOn ^build), format:check, test (shared 7, transactions 16+), build → EXIT:0
```

- [ ] **Step 3: pnpm dev manual**

```bash
docker compose up -d
pnpm dev &
sleep 8
curl -s http://localhost:3001/api/docs | grep -q Swagger && echo "transactions docs OK"
curl -s "http://localhost:3001/api/transactions?page=1&limit=10&status=PENDING" | jq '.meta'
# → { page:1, limit:10, total:..., totalPages:..., hasNext, hasPrev }
curl -s "http://localhost:3001/api/transactions?page=1&limit=10&type=1&from=2026-01-01T00:00:00.000Z&to=2026-08-27T00:00:00.000Z" | jq '.data | length'
```

- [ ] **Step 4: Commit vazio**

```bash
git commit --allow-empty -m "chore(listagem): verifica GET paginado e Swagger"
```

---

## Self-Review

**1. Spec coverage:** Query (§1) → Task 1, DB (§2) → Task 2, Swagger (§3) → Task 3, Verificação (§4) → Task 4 — cobre §1-3 do design 2026-08-27-listagem

**2. Placeholder scan:** Nenhum TBD/TODO, todos os passos têm código completo com imports, schemas, skip/take, meta, decorators

**3. Type consistency:** ListTransactionsQuery de @repo/shared usado em service e controller, page/limit number, status enum, meta com totalPages/hasNext/hasPrev

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-listagem-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
