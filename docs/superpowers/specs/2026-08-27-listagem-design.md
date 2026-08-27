# Design — Listagem Paginada com Filtros (feat/listagem-paginada)

**Data:** 2026-08-27  
**Status:** Aprovado (brainstorming §1-3)  
**Base:** Design 2026-08-26 (Opção A + OpenAPI) + 2026-08-27 anti-fraud (stateless) — este spec detalha §4 `GET /api/transactions` paginado e §10.4 do plano  
**Stack:** Node 24 LTS + pnpm + NestJS 10 + Prisma 5 + Zod 3 + @nestjs/swagger 7 + Vitest 2 + TypeScript strict  
**Contrato:** `GET /api/transactions?page=1&limit=10&status=PENDING&type=1&from=2026-01-01T00:00:00.000Z&to=2026-08-27T00:00:00.000Z` → `{ data: [{ transactionExternalId, transactionType:{name}, transactionStatus:{name}, value, createdAt }], meta: { page, limit, total, totalPages, hasNext, hasPrev } }` com `ORDER BY createdAt DESC, id DESC`

---

## 1. Query e Validação (Seção 1 aprovada)

**Schema em `@repo/shared/src/schemas/transaction.ts` (novo `listTransactionsQuerySchema`):**

```ts
export const listTransactionsQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    type: z.coerce.number().int().positive().optional(), // transferTypeId, ?type=1 (string) → number
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

- Controller: `@Get()` com `@UsePipes(new ZodValidationPipe(listTransactionsQuerySchema))` em `@Query()` (não `@Body`), `400` com `{ message: 'Validation failed', errors: { status: [...], from: [...] } }` igual `POST`
- Coerção: `type`/`page`/`limit` como `?type=1` (string na URL) → `coerce` para número, `from`/`to` como ISO `2026-01-01T00:00:00.000Z`

**Alternativa descartada:** `class-validator` com `ParseIntPipe`/`ParseEnumPipe` (duplica DTO, perde single source Zod).

---

## 2. DB + Índices e Paginação (Seção 2 aprovada)

**Prisma `TransactionsService.findAll(query: ListTransactionsQuery)`:**

```ts
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // + id para determinismo
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

- Índices já existentes em `prisma/schema.prisma`: `@@index([status, createdAt])` cobre `WHERE status + ORDER BY createdAt DESC`, `@@index([transferTypeId])` para `type`, `@@index([createdAt])` para `from/to` range
- Sem N+1: `include: { type: true }` em 1 query

**Alternativa descartada:** Cursor sem `total` (sem `totalPages` para UI) vs Raw SQL `COUNT(*) OVER()` (perde type safety).

---

## 3. Swagger + Testes (Seção 3 aprovada)

**Swagger em `apps/transactions/src/modules/transactions/transactions.controller.ts`:**

```ts
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
async findAll(@Query() query: ListTransactionsQuery) { return this.service.findAll(query); }
```

- Testes (Vitest, sem Testcontainers):
  - `listTransactionsQuerySchema` unit: `status` inválido → 400 com `errors.status`, `from > to` → 400, `limit 100` → 400
  - `TransactionsService.findAll` unit com `prisma` mock: `findMany`/`count` chamados com `where`/`skip`/`take`/`orderBy`, `meta` correto, `status=PENDING` + `type=1` + `from/to`
  - `GET /api/transactions` integração mock: `?page=1&limit=10&status=PENDING` → `200` com `data` e `meta`
  - `pnpm quality` com `turbo` `typecheck`→`build` `dependsOn: ^build` já corrigido (evita `Cannot find module @repo/shared`), `shared` CommonJS

---

## 4. Sequência e DECISIONS

**Sequência neste slice (`feat/listagem-paginada`):**

1. `Zod` `listTransactionsQuerySchema` em `@repo/shared` (status, type, from/to, page/limit) + `ZodValidationPipe` no controller
2. `Prisma` `findAll` com `skip/take` + `count` paralelo, `orderBy createdAt DESC, id DESC`, `meta` com `totalPages/hasNext/hasPrev`, índices já existentes
3. `Swagger` `@ApiQuery`/`@ApiResponse` + `pnpm quality` verde + `pnpm dev` com `shared` `tsc --watch` + `transactions` `nest start --watch`
4. `DECISIONS.md` entrada `Listagem offset com totalPages` (vs cursor)

**DECISIONS.md (novo):**

```md
## Listagem offset com totalPages

**Decisão:** offset `page/limit` + `total`/`totalPages` + `orderBy createdAt DESC`, Zod em @repo/shared, índices status+createdAt
**Alternativas:** cursor sem total, Raw SQL
**Por quê:** contrato já no design §4, totalPages necessário para paginação do dashboard, Prisma type safe, índice otimiza ORDER BY; cursor como evolução para volume alto
```

---

## 5. Riscos e Mitigações

- **OFFSET caro em páginas profundas:** índice `status+createdAt` mitiga `ORDER BY`, `limit` max 50, `DECISIONS.md` registra cursor como evolução
- **`from > to` ou `status` inválido:** `Zod` `refine` + `enum` → `400` com `errors` por campo, sem `500`
- **`count` inconsistente com writes concorrentes:** `total` é snapshot no momento do `count`, aceitável para dashboard; `hasNext/hasPrev` derivam de `totalPages`
- **Testes sem DB real:** mock cobre `where`/`skip`/`take`/`orderBy`, `Testcontainers` documentado como evolução

---

## 6. Referências Context7

- `/nestjs/swagger` — `@ApiQuery`, `@ApiOperation`, `DocumentBuilder`
- `/prisma/docs` — `findMany` skip/take, `count`, `@@index`, `orderBy`
- `/zod` — `coerce`, `enum`, `datetime`, `refine`

---

_Fim do design Fase 4. Próximo passo: `writing-plans` para tasks TDD por slice, com `pnpm quality` verde e Swagger em 3001._
