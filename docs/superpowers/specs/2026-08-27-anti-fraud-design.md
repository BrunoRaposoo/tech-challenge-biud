# Design — Fluxo Anti-Fraude Kafka (feat/fluxo-antifraude-kafka)

**Data:** 2026-08-27  
**Status:** Aprovado (brainstorming §1-4)  
**Base:** Design 2026-08-26 (Opção A + OpenAPI) — este spec detalha §4 Kafka e §10.3 do plano  
**Stack:** Node 24 LTS + pnpm + NestJS 10 + kafkajs + Prisma + Zod + @nestjs/swagger + Vitest  
**Fluxo:** `POST /api/transactions` (3001) → `PENDING` → `transaction.created` (key=externalId) → `anti-fraud` (3002, stateless) → `value>1000?REJECTED:APPROVED` → `transaction.status.updated` → `transactions` consumer `UPDATE WHERE PENDING` idempotente

---

## 1. Infra / Kafka (Seção 1 aprovada)

**Topologia singleton (`name: challenge`):**

- Tópicos: `transaction.created` (transactions → anti-fraud) e `transaction.status.updated` (anti-fraud → transactions), `autoCreateTopics: true` já no KRaft, mas `onModuleInit` fará `admin.createTopics({ topics: [{ topic, numPartitions:3, replicationFactor:1 }] })` idempotente
- Partições: 3 (paralelismo por `transactionExternalId` como `key`, ordem por transação)
- Grupos: `KAFKA_GROUP_ID_ANTI_FRAUD=anti-fraud-consumer` e `KAFKA_GROUP_ID_TRANSACTIONS=transactions-consumer` via `process.env`, `KAFKA_BROKERS=localhost:9092`, `KAFKA_CLIENT_ID=tech-challenge`
- Produtor: `kafkajs` `acks: -1` (all), `idempotent: true`, `key: transactionExternalId`
- DLQ: `transaction.created.dlq` e `transaction.status.updated.dlq` (criados sob demanda quando `safeParse` falha ou `producer.send` falha após retry)
- Health: `kafka:29092` interno, `localhost:9092` externo, `KAFKA_ADVERTISED_LISTENERS` correto, `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`

**Alternativa descartada:** 1 partition (sem paralelismo) vs 3 (escolhido).

---

## 2. Anti-Fraud Stateless (Seção 2 aprovada, porta 3002)

**App `apps/anti-fraud`:**

- `main.ts`: `NestFactory.create(AntiFraudModule)`, `setGlobalPrefix('api')`, `DocumentBuilder` título `Anti-Fraud API — BIUD Challenge` + `SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true })` → `http://localhost:3002/api/docs` e `http://localhost:3002/api/docs-json` (mesmo padrão sem duplo prefixo já corrigido em `transactions`)
- `AntiFraudService` (puro, sem I/O, sem Prisma):
  ```ts
  @Injectable()
  export class AntiFraudService {
    evaluate(value: number): 'APPROVED' | 'REJECTED' {
      return value > 1000 ? 'REJECTED' : 'APPROVED';
    }
  }
  ```
  Testes: `1000 → APPROVED`, `1000.01 → REJECTED`, `999.99 → APPROVED`, `0 → APPROVED`
- `KafkaConsumerService`: `consumer.subscribe({ topic: 'transaction.created', fromBeginning: false })`, `eachMessage: async ({ message }) => { const payload = JSON.parse(message.value.toString()); const parsed = transactionCreatedEventSchema.safeParse(payload); if (!parsed.success) { await producer.send({ topic: 'transaction.created.dlq', messages: [{ value: message.value }] }); return; } const status = this.antiFraud.evaluate(parsed.data.value); await producer.send({ topic: 'transaction.status.updated', messages: [{ key: parsed.data.transactionExternalId, value: JSON.stringify({ transactionExternalId: parsed.data.transactionExternalId, status, evaluatedAt: new Date().toISOString() }) }] }); }` com `retry: { retries:3, initialRetryTime:100, factor:2 }` no producer
- Sem `PrismaModule`, apenas `Logger`

**Alternativas descartadas:** B com DB (acoplado) vs C `@nestjs/microservices` (menos controle de acks/DLQ).

---

## 3. Transactions Consumer Idempotente (Seção 3 aprovada)

**`KafkaService` em `apps/transactions` (mock anterior → kafkajs real):**

- Producer `acks:all, idempotent:true` + consumer `groupId: transactions-consumer` `subscribe 'transaction.status.updated'`, `eachMessage` com `transactionStatusUpdatedEventSchema.safeParse` + `retry 3x` + `DLQ transaction.status.updated.dlq`
- Handler idempotente:

  ```ts
  async handleStatusUpdated(payload: { transactionExternalId: string; status: 'APPROVED' | 'REJECTED' }) {
    await this.prisma.transaction.updateMany({
      where: { transactionExternalId: payload.transactionExternalId, status: 'PENDING' },
      data: { status: payload.status },
    });
    // count 0 se já não PENDING → no-op idempotente, safe para replay at-least-once
  }
  ```

  `transactionExternalId` `@unique` + `key` no Kafka garantem deduplicação e ordem.

- `TransactionsService.create` já publica `transaction.created` com `key` e `acks` (antes mock `log`, agora `kafkajs` real)

**Alternativa descartada:** `findUnique` + `update` com `404` (não idempotente em replay) vs `updateMany WHERE PENDING` (escolhido).

---

## 4. Testes + Swagger (Seção 4 aprovada)

**Testes (mock, sem Testcontainers nesta fase):**

- Unit `AntiFraudService` (4 casos)
- Unit `KafkaService` mock: `producer.send`/`consumer.run` mock, `safeParse` falha → `DLQ` + `commit`, sucesso → `status.updated` com `key`
- Integração mock: `POST /api/transactions` com `value:120` → `emit created` mock → `anti-fraud` consome mock → `APPROVED` → `transactions` `handleStatusUpdated` → `GET` com `transactionExternalId` retorna `APPROVED` (e `value:1500 → REJECTED`)
- Smoke Swagger: `apps/anti-fraud/src/swagger.spec.ts` com `paths['/api/health']` para `anti-fraud`, já existente `swagger.spec.ts` para `transactions`

**Swagger (ambos, sem Postman):**

- `transactions` já em `3001/api/docs` (200 HTML, 200 JSON) com `CreateTransactionDto` via `@ApiProperty`
- `anti-fraud` novo `3002/api/docs` com `DocumentBuilder` título `Anti-Fraud API`, mesmo `setup('docs', { useGlobalPrefix:true })` sem duplo prefixo

**Quality gate:** `pnpm quality` com `turbo` `typecheck`→`build` `dependsOn: ^build` já corrigido (evita `Cannot find module @repo/shared`), `lint` permite `swagger` imports, `test` com mocks.

---

## 5. Sequência e DECISIONS

**Sequência neste slice (`feat/fluxo-antifraude-kafka`):**

1. Scaffold `apps/anti-fraud` (Nest, `main.ts` com Swagger, `AntiFraudService` puro)
2. `Kafka` producer/consumer `kafkajs` em ambos apps (topics, groups, acks, idempotent, retry+DLQ, `safeParse` com `@repo/shared` schemas)
3. `Transactions` consumer idempotente (`updateMany WHERE PENDING`)
4. Testes mock + `pnpm quality` verde + `pnpm dev` com `shared` `tsc --watch` + `transactions`/`anti-fraud` `nest start --watch` + `docker compose up -d` singleton
5. `DECISIONS.md` entrada `Anti-fraud stateless + at-least-once idempotente + DLQ`

**DECISIONS.md (novo):**

```md
## Anti-fraud stateless + DLQ

**Decisão:** anti-fraud stateless (sem DB), kafkajs at-least-once + UPDATE WHERE PENDING idempotente + retry 3x + DLQ
**Alternativas:** anti-fraud com DB, @nestjs/microservices, exactly-once
**Por quê:** escala sem DB, regra pura, controle total de acks/commit, poison não bloqueia partição
```

---

## 6. Riscos e Mitigações (desta fase)

- **Kafka indisponível no boot:** `healthcheck` + `retry` com backoff, `admin.createTopics` idempotente, log + DLQ se `send` falha após retry
- **Poison message:** `safeParse` falha → `DLQ` + `commit`, não `throw` para não rebalancear
- **Replay at-least-once:** `updateMany WHERE PENDING` idempotente, `externalId` unique
- **Testes sem Kafka real:** mock cobre 95%, Testcontainers documentado como evolução em `DECISIONS.md`

---

## 7. Referências Context7

- `/nestjs/swagger` — DocumentBuilder, createDocument, setup com useGlobalPrefix
- `/confluentinc/cp-kafka` — KRaft, acks, idempotent producer
- `/kafkajs` (via `kafkajs` npm) — producer, consumer, retry, DLQ
- `/prisma/docs` — updateMany WHERE, unique

---

_Fim do design Fase 3. Próximo passo: `writing-plans` para tasks TDD por slice, com `pnpm quality` verde e `pnpm dev` com Swagger em 3001 e 3002._
