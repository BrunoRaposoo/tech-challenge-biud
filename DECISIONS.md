# DECISIONS.md — Desafio Técnico BIUD

Formato: **Decisão**, **Alternativas consideradas**, **Por quê** (conforme `PRACTICES.md`).

---

## 1. Monorepo com pnpm workspaces + Turborepo

**Decisão:** Monorepo `pnpm workspaces` + `Turborepo` com `turbo.json` (`build` com `dependsOn: ^build`, `typecheck`/`test` com `dependsOn: ^build`, `dev` com `cache:false, persistent:true`), `pnpm-workspace.yaml` com `apps/*` e `packages/*`, `name: challenge` no `docker-compose.yml` para infra singleton.

**Alternativas consideradas:**

- `Nx` (mais pesado, generators desnecessários para 3 apps)
- Repositórios separados por serviço (dificulta `@repo/shared` e `pnpm quality` único, CI teria que orquestrar 3 repos)
- `pnpm` puro sem Turborepo (sem cache, `pnpm quality` lento, CI repete trabalho)

**Por quê:** Turborepo entrega cache de pipeline para `pnpm quality` (`lint` + `typecheck` + `format:check` + `test` + `build`) exigido por `PRACTICES.md` — mesmo comando local e CI, com `typecheck`→`build` garantindo `dist` antes de `tsc --noEmit` (evita `Cannot find module @repo/shared` no CI fresco). `name: challenge` fixa `challenge-postgres/kafka` e volumes, evitando colisão de `container_name` quando `docker compose up -d` é rodado de worktrees diferentes.

---

## 2. Modelagem de Dados (Prisma)

**Decisão:** Single Postgres, 1 `prisma/schema.prisma` na raiz, `Transaction` com `transactionExternalId String @unique @default(uuid())` exposto na API + `id String @id @default(uuid())` interno, `TransactionStatus` enum `PENDING/APPROVED/REJECTED`, `TransactionType` tabela `id Int @id` + `name String @unique` (seed `1: PIX`), `value Decimal(12,2)`, índices `@@index([status, createdAt])`.

**Alternativas consideradas:**

- `status` como tabela lookup (overkill para 3 valores fixos)
- `status` como `String` sem enum (perde garantia de domínio)
- DB separado por serviço (duplica migrações, overkill para desafio)

**Por quê:** Enum para `status` garante regra de negócio (`value>1000 → REJECTED`) no tipo; tabela para `type` permite evoluir `transferTypeId` sem deploy; `transactionExternalId` desacopla PK interno da API (Guid); single DB simplifica `migrations versionadas` e `DECISIONS.md` defensável, cada serviço acessa só suas tabelas.

---

## 3. Formato dos Eventos

**Decisão:** JSON com payload validado por Zod em `@repo/shared`: `transactionCreatedEventSchema` (`transactionExternalId`, `accountExternalIdDebit/Credit`, `transferTypeId`, `value`, `createdAt` datetime) e `transactionStatusUpdatedEventSchema` (`transactionExternalId`, `status: APPROVED|REJECTED`, `evaluatedAt`), `key = transactionExternalId` no Kafka, `value` como `JSON.stringify`.

**Alternativas consideradas:**

- Avro/Protobuf (mais eficiente, mas overkill sem schema registry)
- Payload sem `createdAt/evaluatedAt` (perde auditoria)
- `key` aleatória (perde ordem por transação)

**Por quê:** JSON + Zod é single source em `@repo/shared` (sem drift entre quem publica e consome), `key` garante partição/order por transação, `safeParse` permite DLQ para poison sem travar.

---

## 4. Tratamento de Falha na Mensageria

**Decisão:** `at-least-once` + **idempotência** `UPDATE ... WHERE status='PENDING'` (`updateMany` com `count 0 → no-op`), `transactionExternalId @unique` para deduplicação, `acks: -1` (all), `idempotent:true`, `retry: { retries:3, initialRetryTime:100, multiplier:2 }`, DLQ `transaction.created.dlq` e `transaction.status.updated.dlq` para `safeParse` falha ou `JSON.parse` throw, `commit` após DLQ para não bloquear partição.

**Alternativas consideradas:**

- `exactly-once` com Kafka transactions (`transactional.id`, `outbox` + 2PC) (custo não justifica volume inicial)
- `outbox` com tabela `OutboxEvent` + poller (garante atomicidade DB+Kafka, documentado como evolução)
- Apenas `log` sem DLQ (perde poison para debug)
- `findUnique` + `update` com `404` (não idempotente em replay)

**Por quê:** `at-least-once` é padrão `kafkajs`, idempotência via `WHERE PENDING` torna replay seguro, DLQ preserva poison sem travar, `idempotent:true` evita duplicatas do producer.

---

## 5. Atualização de Status na Interface

**Decisão:** Polling dinâmico com `TanStack Query` `refetchInterval: (query) => query.state.data?.content.some(t=>t.status==='PENDING') ? 3000 : false`, `refetchIntervalInBackground: false`, `Zustand` apenas para filtros/paginação (server state no Query).

**Alternativas consideradas:**

- `SSE` / `WebSocket` (exige estado de conexão no servidor, overkill para volume pendente baixo)
- Polling fixo 3s sempre (desperdiça requisições quando não há PENDING)
- `SWR` com `refreshInterval` fixo (menos controle que `refetchInterval` dinâmico)

**Por quê:** Validado via Context7 (`/tanstack/query` 2526 snippets, `refetchInterval` dinâmico), volume de `PENDING` simultâneos é baixo, polling não exige estado no servidor; com volume maior, `SSE` passa a valer o custo (registrado como evolução).

---

## 6. Estratégia de Testes

**Decisão:** Vitest + Testing Library, `getByRole` para frontend (`loading` → `role=status`, `error` → `role=alert`, `empty` → `role=status`), `any` banido, `pnpm quality` com `test: dependsOn ^build`, mocks para Kafka (`producer.send`/`consumer.run` em memória) nesta fase, `Testcontainers` documentado como evolução.

**Alternativas consideradas:**

- Jest (mais lento, ESM nativo pior que Vitest)
- `data-testid` (se não é alcançável por `role`, problema está na marcação)
- `Testcontainers` com Kafka real nesta fase (CI mais lento, `docker` no runner)

**Por quê:** `PRACTICES.md` exige `getByRole` antes de `data-testid`, Vitest ESM nativo + cache Turborepo, mocks cobrem 95% do fluxo `PENDING→APPROVED/REJECTED` sem Docker no CI.

---

## 7. Runtime Node 24 LTS

**Decisão:** `Node 24 LTS` (atualiza de `22+` do README), `.nvmrc` `24`, `actions/setup-node@v4` com `node-version: 24`, `engines: >=24` no `package.json`.

**Alternativas consideradas:**

- `Node 22` (README, mas LTS anterior em 2026)
- `Node 20 LTS` (mais antigo)

**Por quê:** LTS mais recente em 2026, patches de segurança, compatibilidade `Next 15`/`Tailwind 4`, README permite "se sua arquitetura pedir outra coisa, mude — e registre o porquê".

---

## 8. OpenAPI com Zod (Swagger)

**Decisão:** `@nestjs/swagger 7.4` + `swagger-ui-express` + `zod-to-openapi` (alias `@asteasolutions/zod-to-openapi 4.8`) com `DocumentBuilder` + `SwaggerModule.createDocument` + `SwaggerModule.setup('docs', app, document, { useGlobalPrefix:true })` → `http://localhost:3001/api/docs` e `http://localhost:3002/api/docs`, DTO manual com `@ApiProperty` refletindo `createTransactionSchema` de `@repo/shared`, `ZodValidationPipe` para validação, `jsonDocumentUrl` default (`/api/docs-json`).

**Alternativas consideradas:**

- DTO duplicado com `@ApiProperty` sem bridge Zod (drift entre Zod e DTO)
- `patchNestJsSwagger` (`nestjs-zod`) com `patchNestJsSwagger()` (magic global, benchmark menor)

**Por quê:** Single source Zod em `@repo/shared` → docs refletem validação real (400 com `errors` por campo), validado Context7 (`/nestjs/swagger` 394 snippets), testável sem Postman via `Try it out`, `pnpm quality` com `swagger.spec.ts` `paths['/api/transactions']`.

---

## 9. Alta Concorrência — Como Abordar (sem implementar)

**Pergunta do README:** lidar com volume alto de escritas e leituras concorrentes.

**Abordagem defendida:**

- **Escrita:** idempotência por `transactionExternalId` (`@unique` + `key` Kafka) → `INSERT ... ON CONFLICT DO NOTHING` ou `UPDATE WHERE status='PENDING'`; partição Kafka por `externalId` garante ordem por transação; `retry` com backoff + `DLQ` evita poison blocking; réplicas stateless de `transactions`/`anti-fraud` atrás de LB, cada `consumer group` escala horizontalmente (até nº partições).
- **Leitura:** índices `@@index([status, createdAt])`, paginação por cursor (`createdAt + id`) para evitar `OFFSET` caro; para escala, `read replica` Postgres + `cache` Redis para `GET /transactions` (TTL curto, invalida em `status.updated`); `CDN` para assets Next.
- **Evolução:** `Outbox` pattern (tabela `OutboxEvent` + poller + `transactional outbox`) para atomicidade DB+Kafka sem 2PC; para `exactly-once`, Kafka transactions (`idempotent producer` + `transactional.id`), mas custo não justifica volume inicial.
- **Observabilidade:** métricas `kafka_consumer_lag`, `http_request_duration`, `db_pool`, traces `OpenTelemetry`, alertas em `lag > threshold`.

**Alternativas descartadas:** Event sourcing puro (complexo, replay), sharding prematuro, `WebSocket` para atualização (stateful, dificulta escala).

---

## 10. Anti-Fraud Stateless + DLQ (Fase 3)

**Decisão:** `apps/anti-fraud` **stateless** (sem `PrismaModule`, sem DB), `AntiFraudService.evaluate(value: number): 'APPROVED'|'REJECTED'` puro (`>1000`), `kafkajs` `acks:all, idempotent:true`, `subscribe transaction.created` com `safeParse` + `DLQ transaction.created.dlq` + `retry 3x`, `producer` `transaction.status.updated` com `key`, `transactions` consumer `transaction.status.updated` com `safeParse` + `DLQ` + `updateMany WHERE PENDING` idempotente.

**Alternativas consideradas:**

- `anti-fraud` com `Prisma` (acoplado, precisa compartilhar DB)
- `@nestjs/microservices` `Transport.KAFKA` com `@MessagePattern` (abstração esconde `acks`/`retry`/`DLQ`/`commit`)

**Por quê:** Regra pura sem I/O, escala horizontal sem DB, controle total de `acks`/`commit`/`DLQ`, `updateMany WHERE PENDING` torna `at-least-once` seguro, `pnpm dev` com `shared: tsc --watch` + `transactions`/`anti-fraud` `nest start --watch` e `docker compose` singleton `name: challenge`.
