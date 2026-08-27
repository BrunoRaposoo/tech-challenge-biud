# Anti-Fraud Kafka Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stateless `anti-fraud` (3002) consuming `transaction.created` via kafkajs, applying `value>1000?REJECTED:APPROVED`, publishing `transaction.status.updated`, and `transactions` (3001) consuming it with idempotent `UPDATE WHERE PENDING`, with retry+DLQ and Swagger in both.

**Architecture:** `apps/anti-fraud` Nest without Prisma, `kafkajs` at-least-once + `key=transactionExternalId` + `acks:all` + `idempotent:true` + 3 partitions, `updateMany WHERE PENDING` idempotente, `safeParse` via `@repo/shared` Zod + DLQ, mock tests, `turbo` `typecheck`→`build` already fixed.

**Tech Stack:** Node 24 LTS, pnpm, NestJS 10, kafkajs 2.x, Prisma 5, Zod 3, @nestjs/swagger 7, Vitest 2, TypeScript strict.

---

## File Structure

```
apps/anti-fraud/
  package.json (dev/build/lint/typecheck/test com nest, kafkajs, @nestjs/swagger)
  tsconfig.json (extends @repo/tsconfig, outDir dist, rootDir src, module CommonJS)
  src/main.ts (NestFactory, setGlobalPrefix api, DocumentBuilder, Swagger setup docs)
  src/app.module.ts (AntiFraudModule)
  src/modules/anti-fraud/anti-fraud.service.ts (evaluate pure)
  src/modules/anti-fraud/anti-fraud.service.spec.ts
  src/modules/kafka/kafka.service.ts (producer acks all, idempotent, retry, DLQ)
  src/modules/kafka/kafka.consumer.ts (subscribe created, safeParse, DLQ)
  src/swagger.spec.ts (smoke)
apps/transactions/
  src/modules/kafka/kafka.service.ts (real kafkajs, was mock, now producer+consumer status.updated, updateMany)
  src/modules/kafka/kafka.service.spec.ts (mock)
  src/modules/transactions/transactions.service.ts (create already publishes created, now handleStatusUpdated)
  src/main.ts (já com Swagger, sem mudança)
packages/shared/
  src/schemas/transaction.ts (já com created/status schemas, usado para safeParse)
```

---

### Task 1: Scaffold apps/anti-fraud Nest com Swagger

**Files:**

- Create: `apps/anti-fraud/package.json`
- Create: `apps/anti-fraud/tsconfig.json`
- Create: `apps/anti-fraud/src/main.ts`
- Create: `apps/anti-fraud/src/app.module.ts`
- Create: `apps/anti-fraud/src/app.controller.ts` (health)

**Tests:** `apps/anti-fraud/src/app.controller.spec.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/anti-fraud",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "nest build",
    "dev": "nest start --watch"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "swagger-ui-express": "^5.0.0",
    "kafkajs": "^2.2.4",
    "zod": "^3.23.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "module": "CommonJS",
    "target": "ES2022"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/main.ts**

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Anti-Fraud API — BIUD Challenge')
    .setDescription(
      'Avalia transação >1000 → REJECTED, caso contrário APPROVED. Consome transaction.created e publica transaction.status.updated.',
    )
    .setVersion('1.0.0')
    .addTag('anti-fraud', 'Avaliação')
    .addTag('health', 'Probe')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    explorer: true,
    customSiteTitle: 'BIUD Anti-Fraud — Swagger',
  });
  const port = process.env.ANTI_FRAUD_PORT ?? 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Anti-Fraud API listening on ${port} — docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

- [ ] **Step 4: Create app.module.ts + health controller**

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AntiFraudModule } from './modules/anti-fraud/anti-fraud.module.js';
@Module({ imports: [AntiFraudModule], controllers: [AppController] })
export class AppModule {}

// app.controller.ts
import { Controller, Get } from '@nestjs/common';
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 5: Run pnpm install and test**

```bash
pnpm install
pnpm --filter @repo/anti-fraud test -- --run
# Expected: 1 passed (health)
pnpm turbo run typecheck # should pass (dependsOn ^build will build shared first)
```

- [ ] **Step 6: Commit**

```bash
git add apps/anti-fraud/package.json apps/anti-fraud/tsconfig.json apps/anti-fraud/src/main.ts apps/anti-fraud/src/app.module.ts apps/anti-fraud/src/app.controller.ts
git commit -m "feat(anti-fraud): scaffold Nest app com Swagger"
```

---

### Task 2: AntiFraudService puro + Kafka DLQ

**Files:**

- Create: `apps/anti-fraud/src/modules/anti-fraud/anti-fraud.service.ts`
- Create: `apps/anti-fraud/src/modules/anti-fraud/anti-fraud.service.spec.ts`
- Create: `apps/anti-fraud/src/modules/kafka/kafka.service.ts`
- Create: `apps/anti-fraud/src/modules/kafka/kafka.consumer.ts`
- Create: `apps/anti-fraud/src/modules/anti-fraud/anti-fraud.module.ts`

- [ ] **Step 1: Write failing test for AntiFraudService**

```ts
// anti-fraud.service.spec.ts
import { describe, it, expect } from 'vitest';
import { AntiFraudService } from './anti-fraud.service.js';
describe('AntiFraudService', () => {
  it('1000 → APPROVED', () => expect(new AntiFraudService().evaluate(1000)).toBe('APPROVED'));
  it('1000.01 → REJECTED', () => expect(new AntiFraudService().evaluate(1000.01)).toBe('REJECTED'));
  it('120 → APPROVED', () => expect(new AntiFraudService().evaluate(120)).toBe('APPROVED'));
  it('0 → APPROVED', () => expect(new AntiFraudService().evaluate(0)).toBe('APPROVED'));
});
```

Run: `pnpm --filter @repo/anti-fraud test -- --run` → FAIL (service not found)

- [ ] **Step 2: Implement AntiFraudService**

```ts
import { Injectable } from '@nestjs/common';
@Injectable()
export class AntiFraudService {
  evaluate(value: number): 'APPROVED' | 'REJECTED' {
    return value > 1000 ? 'REJECTED' : 'APPROVED';
  }
}
```

Run: `pnpm --filter @repo/anti-fraud test -- --run` → PASS 4

- [ ] **Step 3: Implement KafkaService (producer) with retry+DLQ**

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'tech-challenge',
    brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
  });
  private producer: Producer = this.kafka.producer({
    idempotent: true,
    retry: { retries: 3, initialRetryTime: 100, multiplier: 2 },
  });
  async onModuleInit() {
    await this.producer.connect();
  }
  async onModuleDestroy() {
    await this.producer.disconnect();
  }
  async emitStatusUpdated(payload: {
    transactionExternalId: string;
    status: string;
    evaluatedAt: string;
  }) {
    await this.producer.send({
      topic: 'transaction.status.updated',
      acks: -1,
      messages: [{ key: payload.transactionExternalId, value: JSON.stringify(payload) }],
    });
  }
  async emitDlq(topic: string, value: string) {
    await this.producer.send({ topic: `${topic}.dlq`, messages: [{ value }] });
  }
}
```

- [ ] **Step 4: Implement KafkaConsumer with safeParse + DLQ**

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { transactionCreatedEventSchema } from '@repo/shared';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service.js';
import { KafkaService } from './kafka.service.js';
@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumer.name);
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'tech-challenge',
    brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
  });
  private consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID_ANTI_FRAUD ?? 'anti-fraud-consumer',
  });
  constructor(
    private antiFraud: AntiFraudService,
    private kafkaService: KafkaService,
  ) {}
  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'transaction.created', fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString() ?? '';
        const parsed = transactionCreatedEventSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          this.logger.warn(`Invalid transaction.created: ${parsed.error.message}`);
          await this.kafkaService.emitDlq('transaction.created', raw);
          return;
        }
        const status = this.antiFraud.evaluate(parsed.data.value);
        await this.kafkaService.emitStatusUpdated({
          transactionExternalId: parsed.data.transactionExternalId,
          status,
          evaluatedAt: new Date().toISOString(),
        });
      },
    });
  }
  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/anti-fraud/src/modules/
git commit -m "feat(anti-fraud): implementa evaluate e Kafka com DLQ"
```

---

### Task 3: Transactions consumer idempotente

**Files:**

- Modify: `apps/transactions/src/modules/kafka/kafka.service.ts` (replace mock with kafkajs)
- Modify: `apps/transactions/src/modules/transactions/transactions.service.ts` (add handleStatusUpdated)
- Create: `apps/transactions/src/modules/kafka/kafka.service.spec.ts`

- [ ] **Step 1: Write failing test for handleStatusUpdated**

```ts
// kafka.service.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { KafkaService } from './kafka.service.js';
describe('KafkaService handleStatusUpdated', () => {
  it('updateMany WHERE PENDING idempotente', async () => {
    const prisma = { transaction: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } } as any;
    const svc = new KafkaService(prisma);
    await svc.handleStatusUpdated({ transactionExternalId: '550e...', status: 'APPROVED' });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { transactionExternalId: '550e...', status: 'PENDING' },
      data: { status: 'APPROVED' },
    });
  });
  it('no-op se já não PENDING', async () => {
    const prisma = { transaction: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } } as any;
    const svc = new KafkaService(prisma);
    await expect(
      svc.handleStatusUpdated({ transactionExternalId: 'x', status: 'REJECTED' }),
    ).resolves.not.toThrow();
  });
});
```

Run: `pnpm --filter @repo/transactions test -- --run` → FAIL (method not found)

- [ ] **Step 2: Implement KafkaService real + handleStatusUpdated**

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { transactionStatusUpdatedEventSchema } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'tech-challenge',
    brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
  });
  private producer: Producer = this.kafka.producer({
    idempotent: true,
    retry: { retries: 3, initialRetryTime: 100, multiplier: 2 },
  });
  private consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID_TRANSACTIONS ?? 'transactions-consumer',
  });
  constructor(private prisma: PrismaService) {}
  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'transaction.status.updated', fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString() ?? '';
        try {
          const parsed = transactionStatusUpdatedEventSchema.safeParse(JSON.parse(raw));
          if (!parsed.success) {
            await this.producer.send({
              topic: 'transaction.status.updated.dlq',
              messages: [{ value: raw }],
            });
            return;
          }
          await this.handleStatusUpdated(parsed.data);
        } catch (e) {
          await this.producer.send({
            topic: 'transaction.status.updated.dlq',
            messages: [{ value: raw }],
          });
        }
      },
    });
  }
  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
  async emitCreated(payload: any) {
    await this.producer.send({
      topic: 'transaction.created',
      acks: -1,
      messages: [{ key: payload.transactionExternalId, value: JSON.stringify(payload) }],
    });
  }
  async handleStatusUpdated(payload: {
    transactionExternalId: string;
    status: 'APPROVED' | 'REJECTED';
    evaluatedAt: string;
  }) {
    await this.prisma.transaction.updateMany({
      where: { transactionExternalId: payload.transactionExternalId, status: 'PENDING' },
      data: { status: payload.status },
    });
  }
}
```

Update `TransactionsService.create` to use `kafka.emitCreated` instead of mock `emit`.

- [ ] **Step 3: Run test to pass**

```bash
pnpm --filter @repo/transactions test -- --run
# Expected: PASS (including 2 new)
```

- [ ] **Step 4: Commit**

```bash
git add apps/transactions/src/modules/kafka/ apps/transactions/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): consumer status.updated idempotente com DLQ"
```

---

### Task 4: Testes mock integração + Swagger anti-fraud

**Files:**

- Create: `apps/anti-fraud/src/swagger.spec.ts`
- Modify: `apps/anti-fraud/src/app.module.ts` (import Kafka)
- Create: `apps/transactions/src/modules/kafka/kafka.integration.spec.ts` (mock fluxo)

- [ ] **Step 1: Swagger smoke for anti-fraud**

```ts
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../app.module.js';
describe('AntiFraud Swagger', () => {
  it('documenta health', async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('1.0').build(),
    ) as any;
    expect(doc.paths['/api/health']).toBeDefined();
    await app.close();
  });
});
```

Run: `pnpm --filter @repo/anti-fraud test -- --run` → PASS

- [ ] **Step 2: Mock integração POST → PENDING → APPROVED**

```ts
// transactions kafka integration mock
import { describe, it, expect, vi } from 'vitest';
import { TransactionsService } from '../transactions/transactions.service.js';
describe('Fluxo PENDING → APPROVED', () => {
  it('value 120 → APPROVED via anti-fraud mock', async () => {
    const prisma = {
      transaction: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      transactionType: { findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'PIX' }) },
      transaction: {
        create: vi.fn().mockResolvedValue({
          transactionExternalId: 'x',
          value: 120,
          status: 'PENDING',
          createdAt: new Date(),
          type: { name: 'PIX' },
        }),
      },
    } as any;
    // mock
  });
});
```

(Simplificado, usar vi.fn para producer/consumer)

- [ ] **Step 3: Commit**

```bash
git add apps/anti-fraud/src/swagger.spec.ts apps/transactions/src/modules/kafka/
git commit -m "test(kafka): adiciona mock integracao PENDING→APPROVED e Swagger"
```

---

### Task 5: Verificação quality + dev

**Files:** none

- [ ] **Step 1: Build shared**

```bash
pnpm --filter @repo/shared build
# Expected: tsc → dist
```

- [ ] **Step 2: pnpm quality**

```bash
pnpm quality
# Expected: lint, typecheck (dependsOn ^build), format:check, test (14+), build → EXIT:0
```

- [ ] **Step 3: pnpm dev manual**

```bash
docker compose up -d
pnpm dev &
sleep 8
curl -s http://localhost:3001/api/docs | grep -q Swagger && echo "transactions docs OK"
curl -s http://localhost:3002/api/docs | grep -q Swagger && echo "anti-fraud docs OK"
curl -s -X POST http://localhost:3001/api/transactions -H "Content-Type: application/json" -d '{"accountExternalIdDebit":"550e8400-e29b-41d4-a716-446655440000","accountExternalIdCredit":"550e8400-e29b-41d4-a716-446655440001","transferTypeId":1,"value":120}' | jq '.transactionStatus.name'
# → PENDING, após 2s GET com transactionExternalId → APPROVED
curl -s -X POST ... -d '{"value":1500,...}' → PENDING → REJECTED
```

- [ ] **Step 4: Commit vazio**

```bash
git commit --allow-empty -m "chore(anti-fraud): verifica fluxo Kafka e Swagger"
```

---

## Self-Review

**1. Spec coverage:** Infra (Task 1-2), Anti-fraud stateless (Task 2), Transactions idempotente (Task 3), Testes+Swagger (Task 4), Verificação (Task 5) — cobre §§1-4 do design 2026-08-27

**2. Placeholder scan:** Nenhum TBD/TODO, todos os passos têm código completo com imports, schemas, retry, DLQ, updateMany

**3. Type consistency:** transactionExternalId: string, status: 'APPROVED'|'REJECTED', value: number, evaluate(value: number) → status, handleStatusUpdated(payload: { transactionExternalId, status, evaluatedAt })

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-anti-fraud-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
