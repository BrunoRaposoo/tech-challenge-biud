# OpenAPI / Swagger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar Swagger UI em `transactions` (3001) e `anti-fraud` (3002) desde o início, com schemas gerados do Zod em `@repo/shared` via `zod-to-openapi`, para testes manuais sem Postman/Insomnia/Bruno.

**Architecture:** `@nestjs/swagger` + `zod-to-openapi` bridge: DocumentBuilder + SwaggerModule.createDocument + SwaggerModule.setup('api/docs') com useGlobalPrefix, Zod como single source, DTOs gerados via createZodDto, cada serviço expõe `/api/docs` e `/api/docs-json`.

**Tech Stack:** Node 24 LTS, pnpm, NestJS 10+, @nestjs/swagger 7.x, swagger-ui-express, zod-to-openapi 4.x, Zod 3.x, Vitest, TypeScript strict.

---

## File Structure

```
apps/transactions/
  src/main.ts (adiciona Swagger setup)
  src/modules/transactions/dto/create-transaction.dto.ts (novo, Zod bridge)
  src/modules/transactions/transactions.controller.ts (adiciona @ApiTags etc)
  src/swagger.spec.ts (smoke test)
  package.json (deps @nestjs/swagger, zod-to-openapi)
apps/anti-fraud/
  src/main.ts (quando criado, mesmo setup, porta 3002)
  src/swagger.spec.ts
packages/shared/
  src/schemas/transaction.ts (já existe, será usado como fonte)
```

---

### Task 1: Instalar dependências OpenAPI no monorepo

**Files:**

- Modify: `package.json` (raiz) ou `apps/transactions/package.json`
- Modify: `pnpm-workspace.yaml` (se precisar)

- [ ] **Step 1: Adicionar deps no transactions**

```bash
pnpm --filter @repo/transactions add @nestjs/swagger@^7.4.0 swagger-ui-express@^5.0.0
pnpm --filter @repo/transactions add zod-to-openapi@^4.0.0
# ou no root: pnpm add -w -D @nestjs/swagger
```

```json
// apps/transactions/package.json deps
"@nestjs/swagger": "^7.4.0",
"swagger-ui-express": "^5.0.0",
"zod-to-openapi": "^4.0.0"
```

- [ ] **Step 2: Verificar install**

```bash
pnpm install
# Expected: added 3 packages, pnpm-lock.yaml atualizado
```

- [ ] **Step 3: Commit**

```bash
git add apps/transactions/package.json pnpm-lock.yaml
git commit -m "feat(openapi): adiciona @nestjs/swagger e zod-to-openapi"
```

---

### Task 2: Setup SwaggerModule em transactions main.ts

**Files:**

- Modify: `apps/transactions/src/main.ts`
- Create: `apps/transactions/src/swagger.spec.ts` (smoke)

- [ ] **Step 1: Write failing smoke test**

```ts
// apps/transactions/src/swagger.spec.ts
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

describe('Swagger', () => {
  it('documenta POST /api/transactions', async () => {
    const app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const nestApp = app.createNestApplication();
    const config = new DocumentBuilder().setTitle('Test').setVersion('1.0').build();
    const doc = SwaggerModule.createDocument(nestApp, config);
    expect(doc.paths['/api/transactions']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to fail**

```bash
pnpm --filter @repo/transactions test -- --run src/swagger.spec.ts
# Expected: FAIL — document.paths undefined (nenhum Swagger setup ainda, mas teste deve falhar por falta de docs)
```

- [ ] **Step 3: Implement main.ts com Swagger**

```ts
// apps/transactions/src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Transactions API — BIUD Challenge')
    .setDescription(
      'Criação e consulta de transações com validação antifraude assíncrona (PENDING → APPROVED/REJECTED, regra >1000). Teste manual via Swagger UI sem Postman.',
    )
    .setVersion('1.0.0')
    .addTag('transactions', 'Criação e consulta')
    .addTag('health', 'Probe')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: true,
    explorer: true,
    jsonDocumentUrl: '/api/docs-json',
    yamlDocumentUrl: '/api/docs-yaml',
    customSiteTitle: 'BIUD Transactions — Swagger',
  });

  const port = process.env.TRANSACTIONS_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Transactions API listening on ${port} — docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

- [ ] **Step 4: Run test to pass**

```bash
pnpm --filter @repo/transactions test -- --run src/swagger.spec.ts
# Expected: PASS (document.paths['/api/transactions'] definido)
```

- [ ] **Step 5: Commit**

```bash
git add apps/transactions/src/main.ts apps/transactions/src/swagger.spec.ts
git commit -m "feat(openapi): configura SwaggerModule em transactions"
```

---

### Task 3: Bridge Zod → OpenAPI e anotar controller

**Files:**

- Create: `apps/transactions/src/modules/transactions/dto/create-transaction.dto.ts`
- Modify: `apps/transactions/src/modules/transactions/transactions.controller.ts`
- Test: `apps/transactions/src/modules/transactions/transactions.controller.spec.ts` (atualiza)

- [ ] **Step 1: Create DTO bridge**

```ts
// apps/transactions/src/modules/transactions/dto/create-transaction.dto.ts
import { createZodDto } from 'nestjs-zod';
import { createTransactionSchema } from '@repo/shared';

export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}
// zod-to-openapi registra schema automaticamente quando usado com @ApiBody
```

_Nota:_ Se `nestjs-zod` não for usado, alternativa pura `zod-to-openapi`:

```ts
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createTransactionSchema } from '@repo/shared';
extendZodWithOpenApi(z);
export const CreateTransactionOpenApi = createTransactionSchema.openapi('CreateTransaction');
```

- [ ] **Step 2: Annotate controller**

```ts
// apps/transactions/src/modules/transactions/transactions.controller.ts
import { Controller, Post, Get, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { createTransactionSchema } from '@repo/shared';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private service: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria transação PENDING',
    description: 'Salva PENDING e publica transaction.created',
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Transação PENDING criada',
    schema: {
      example: {
        transactionExternalId: '550e...',
        transactionType: { name: 'PIX' },
        transactionStatus: { name: 'PENDING' },
        value: 120,
        createdAt: '2026-08-26T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      example: {
        message: 'Validation failed',
        errors: { value: ['Number must be greater than 0'] },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(createTransactionSchema))
  async create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Get(':externalId')
  @ApiOperation({ summary: 'Recupera transação por externalId' })
  @ApiParam({
    name: 'externalId',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Transação encontrada' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Param('externalId') externalId: string) {
    return this.service.findOne(externalId);
  }
}
```

- [ ] **Step 3: Run lint/typecheck/test**

```bash
pnpm --filter @repo/transactions test -- --run
# Expected: 10 passed (inclui swagger)
pnpm turbo run typecheck
# Expected: PASS
```

- [ ] **Step 4: Commit**

```bash
git add apps/transactions/src/modules/transactions/dto/ apps/transactions/src/modules/transactions/transactions.controller.ts
git commit -m "feat(openapi): anota controller com @ApiTags e bridge Zod"
```

---

### Task 4: Verificação manual e quality gate

**Files:** nenhum novo, apenas verificação

- [ ] **Step 1: Build e run**

```bash
pnpm turbo run build
pnpm --filter @repo/transactions dev &
sleep 5
curl -s http://localhost:3001/api/docs-json | jq '.paths | keys' | head -20
# Expected: ["/api/transactions", "/api/transactions/{externalId}", "/api/health"]
curl -s http://localhost:3001/api/docs | grep -q "swagger-ui" && echo "Swagger UI OK"
```

- [ ] **Step 2: pnpm quality**

```bash
pnpm quality
# Expected: EXIT 0 (lint, typecheck, format:check, test, build)
```

- [ ] **Step 3: Commit vazio ou docs**

```bash
git commit --allow-empty -m "chore(openapi): verifica Swagger UI em /api/docs"
```

---

### Task 5: Repetir para anti-fraud (quando Fase 3 criar app)

**Files:**

- Modify: `apps/anti-fraud/src/main.ts` (quando existir)
- Create: `apps/anti-fraud/src/swagger.spec.ts`

- [ ] **Step 1: Mesmo setup com porta 3002 e título Anti-Fraud**

```ts
const config = new DocumentBuilder()
  .setTitle('Anti-Fraud API — BIUD Challenge')
  .setDescription('Avalia transação >1000 → REJECTED')
  .addTag('anti-fraud')
  .build();
SwaggerModule.setup('api/docs', app, document);
```

- [ ] **Step 2: Test e commit**

```bash
pnpm --filter @repo/anti-fraud test -- --run
git add apps/anti-fraud/src/main.ts
git commit -m "feat(openapi): configura SwaggerModule em anti-fraud"
```

---

## Self-Review

**1. Spec coverage:** §5 OpenAPI do design coberto por Tasks 1-5 (ambos serviços, zod-to-openapi, DocumentBuilder, setup, decorators, smoke test)

**2. Placeholder scan:** Nenhum TBD/TODO, todos os passos têm código completo

**3. Type consistency:** CreateTransactionDto estende createZodDto(createTransactionSchema) de @repo/shared, usado em controller e pipe

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-26-openapi-swagger-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
