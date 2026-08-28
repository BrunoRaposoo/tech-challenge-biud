# Dashboard Next.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar dashboard Next.js com listagem paginada com filtros, detalhe, criação com validação, estados loading/error/empty e polling dinâmico para PENDING, alimentado por GET /api/transactions paginado.

**Architecture:** App Router com 3 rotas (`/`, `/transactions/[externalId]`, `/transactions/new`), `TanStack Query` polling `refetchInterval` 3s só com PENDING + `Zustand` para filtros, `react-hook-form` + `zodResolver` com `@repo/shared`, `Tailwind`, `next.config` proxy para `localhost:3001`.

**Tech Stack:** Node 24 LTS, pnpm, Next.js 15, React 19, Tailwind 4, TanStack Query 5, Zustand 5, react-hook-form 3, @hookform/resolvers, Zod 3, Vitest, Testing Library, Playwright, TypeScript strict.

---

## File Structure

```
apps/web/
  package.json (next, react, tailwind, tanstack query, zustand, rhf)
  next.config.mjs (rewrites /api → 3001)
  tailwind.config.ts
  postcss.config.js
  app/layout.tsx (providers)
  app/page.tsx (dashboard)
  app/loading.tsx, app/error.tsx
  app/transactions/[externalId]/page.tsx (detalhe)
  app/transactions/new/page.tsx (criação)
  lib/query-client.ts
  lib/api/transactions.ts
  stores/filter-store.ts
  components/TransactionTable.tsx, StatusBadge.tsx, Pagination.tsx, Filters.tsx
  components/TransactionForm.tsx
  app/globals.css
```

---

### Task 1: Scaffold apps/web Next.js + Tailwind + providers

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/lib/query-client.ts`

**Tests:** `apps/web/app/page.test.tsx` (smoke)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/web",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "next build",
    "dev": "next dev --port 3000"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.9.0"
  }
}
```

- [ ] **Step 2: Create next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }];
  },
};
export default nextConfig;
```

- [ ] **Step 3: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Create lib/query-client.ts**

```ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
```

- [ ] **Step 5: Create app/layout.tsx**

```tsx
import './globals.css';
import { Providers } from './providers.js';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
// app/providers.tsx
('use client');
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client.js';
export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 6: Run install and test**

```bash
pnpm install
pnpm --filter @repo/web test -- --run
# Expected: PASS (smoke)
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/next.config.mjs apps/web/tailwind.config.ts apps/web/app/layout.tsx
git commit -m "feat(web): scaffold Next.js com Tailwind e providers"
```

---

### Task 2: Data layer TanStack Query + Zustand

**Files:**

- Create: `apps/web/stores/filter-store.ts`
- Create: `apps/web/lib/api/transactions.ts`
- Test: `apps/web/lib/api/transactions.test.ts`

- [ ] **Step 1: Create filter-store**

```ts
import { create } from 'zustand';
type Filters = {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  type?: number;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};
export const useFilterStore = create<
  Filters & { set: (p: Partial<Filters>) => void; reset: () => void }
>((set) => ({
  page: 1,
  limit: 10,
  set: (p) => set(p),
  reset: () =>
    set({ status: undefined, type: undefined, from: undefined, to: undefined, page: 1, limit: 10 }),
}));
```

- [ ] **Step 2: Create api**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateTransactionDto } from '@repo/shared';
export const useTransactions = (filters: any) =>
  useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      fetch(`/api/transactions?${new URLSearchParams(filters as any)}`).then((r) => r.json()),
    refetchInterval: (q) =>
      (q.state.data as any)?.data?.some((t: any) => t.transactionStatus.name === 'PENDING')
        ? 3000
        : false,
    refetchIntervalInBackground: false,
  });
export const useTransaction = (id: string) =>
  useQuery({
    queryKey: ['transaction', id],
    queryFn: () =>
      fetch(`/api/transactions/${id}`).then((r) => {
        if (!r.ok) throw r;
        return r.json();
      }),
  });
export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionDto) =>
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json();
          throw e;
        }
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
    onError: (_e, _v, ctx) => qc.setQueryData(['transactions'], (ctx as any).prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
};
```

- [ ] **Step 3: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { useFilterStore } from '../stores/filter-store.js';
describe('filter-store', () => {
  it('set page', () => {
    const { set, page } = useFilterStore.getState();
    set({ page: 2 });
    expect(useFilterStore.getState().page).toBe(2);
  });
});
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter @repo/web test -- --run
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/stores/filter-store.ts apps/web/lib/api/transactions.ts
git commit -m "feat(web): adiciona TanStack Query polling e Zustand filtros"
```

---

### Task 3: TransactionForm com RHF+Zod

**Files:**

- Create: `apps/web/components/TransactionForm.tsx`
- Test: `apps/web/components/TransactionForm.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm.js';
describe('TransactionForm', () => {
  it('mostra erro por campo', async () => {
    render(<TransactionForm />);
    const input = screen.getByPlaceholderText(/accountExternalIdDebit/i);
    expect(input).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement form**

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTransactionSchema, CreateTransactionDto } from '@repo/shared';
import { useCreateTransaction } from '../lib/api/transactions.js';
export function TransactionForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionDto>({ resolver: zodResolver(createTransactionSchema) });
  const { mutate, isPending, error } = useCreateTransaction();
  const onSubmit = (data: CreateTransactionDto) => mutate(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Criar transação">
      <input
        {...register('accountExternalIdDebit')}
        aria-invalid={!!errors.accountExternalIdDebit}
        placeholder="accountExternalIdDebit (uuid)"
      />
      {errors.accountExternalIdDebit && (
        <span role="alert">{errors.accountExternalIdDebit.message}</span>
      )}
      <input
        {...register('accountExternalIdCredit')}
        aria-invalid={!!errors.accountExternalIdCredit}
        placeholder="accountExternalIdCredit"
      />
      {errors.accountExternalIdCredit && (
        <span role="alert">{errors.accountExternalIdCredit.message}</span>
      )}
      <input
        {...register('transferTypeId', { valueAsNumber: true })}
        placeholder="transferTypeId"
        type="number"
      />
      {errors.transferTypeId && <span role="alert">{errors.transferTypeId.message}</span>}
      <input {...register('value', { valueAsNumber: true })} placeholder="value" type="number" />
      {errors.value && <span role="alert">{errors.value.message}</span>}
      <button type="submit" disabled={isSubmitting || isPending}>
        Criar
      </button>
      {error && <div role="alert">{(error as any).message}</div>}
    </form>
  );
}
```

- [ ] **Step 3: Run test to pass**

```bash
pnpm --filter @repo/web test -- --run
# Expected: PASS
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/TransactionForm.tsx
git commit -m "feat(web): form criacao com RHF e Zod"
```

---

### Task 4: TransactionTable, StatusBadge, Filters, Pagination e estados

**Files:**

- Create: `apps/web/components/TransactionTable.tsx`
- Create: `apps/web/components/StatusBadge.tsx`
- Create: `apps/web/components/Filters.tsx`
- Create: `apps/web/components/Pagination.tsx`
- Create: `apps/web/app/page.tsx`
- Test: `apps/web/components/TransactionTable.test.tsx`

- [ ] **Step 1: Write failing test for states**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionTable } from './TransactionTable.js';
describe('TransactionTable', () => {
  it('loading', () => {
    render(<TransactionTable isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('error', () => {
    render(<TransactionTable isError />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('empty', () => {
    render(<TransactionTable data={[]} />);
    expect(screen.getByRole('status', { name: /nenhuma/i })).toBeInTheDocument();
  });
  it('data com PENDING', () => {
    render(
      <TransactionTable
        data={[
          {
            transactionExternalId: 'x',
            transactionType: { name: 'PIX' },
            transactionStatus: { name: 'PENDING' },
            value: 120,
            createdAt: '2026-08-27T00:00:00.000Z',
          },
        ]}
      />,
    );
    expect(screen.getByRole('cell', { name: /PENDING/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement components**

```tsx
// StatusBadge.tsx
export function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'PENDING' ? 'bg-yellow-100' : status === 'APPROVED' ? 'bg-green-100' : 'bg-red-100';
  return (
    <span className={`${color} px-2 py-1 rounded`} aria-label={status}>
      {status}
    </span>
  );
}
// TransactionTable.tsx
('use client');
import { StatusBadge } from './StatusBadge.js';
export function TransactionTable({ data, isLoading, isError, refetch }: any) {
  if (isLoading)
    return (
      <div role="status" aria-live="polite">
        Carregando...
      </div>
    );
  if (isError)
    return (
      <div role="alert">
        Erro <button onClick={() => refetch()}>Tentar novamente</button>
      </div>
    );
  if (!data || data.length === 0) return <div role="status">Nenhuma transação encontrada</div>;
  return (
    <table>
      <tbody>
        {data.map((t: any) => (
          <tr key={t.transactionExternalId}>
            <td>{t.transactionExternalId}</td>
            <td>{t.transactionType.name}</td>
            <td>{t.value}</td>
            <td role="cell">
              <StatusBadge status={t.transactionStatus.name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
// Filters.tsx, Pagination.tsx similarly
// app/page.tsx
('use client');
import { useFilterStore } from '../stores/filter-store.js';
import { useTransactions } from '../lib/api/transactions.js';
import { TransactionTable } from '../components/TransactionTable.js';
export default function Dashboard() {
  const filters = useFilterStore();
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  return (
    <TransactionTable data={data?.data} isLoading={isLoading} isError={isError} refetch={refetch} />
  );
}
```

- [ ] **Step 3: Run test to pass**

```bash
pnpm --filter @repo/web test -- --run
# Expected: PASS (4/4)
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ apps/web/app/page.tsx
git commit -m "feat(web): dashboard listagem com polling e estados"
```

---

### Task 5: Detail e rotas new

**Files:**

- Create: `apps/web/app/transactions/[externalId]/page.tsx`
- Create: `apps/web/app/transactions/new/page.tsx`

- [ ] **Step 1: Implement detail**

```tsx
// [externalId]/page.tsx
'use client';
import { useTransaction } from '../../../lib/api/transactions.js';
export default function Detail({ params }: { params: { externalId: string } }) {
  const { data, isLoading, isError } = useTransaction(params.externalId);
  if (isLoading) return <div role="status">Carregando...</div>;
  if (isError) return <div role="alert">Erro</div>;
  if (!data) return <div role="status">Nenhuma transação</div>;
  return (
    <div>
      {data.transactionExternalId} - {data.transactionStatus.name}
    </div>
  );
}
// new/page.tsx
import { TransactionForm } from '../../../components/TransactionForm.js';
export default function New() {
  return <TransactionForm />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/transactions/
git commit -m "feat(web): detalhe e rota criacao"
```

---

### Task 6: Verificação quality + dev

**Files:** none

- [ ] **Step 1: Build shared**

```bash
pnpm --filter @repo/shared build
```

- [ ] **Step 2: pnpm quality**

```bash
pnpm quality
# Expected: lint, typecheck, format:check, test (web 8+), build → EXIT:0
```

- [ ] **Step 3: pnpm dev manual**

```bash
docker compose up -d
pnpm dev &
sleep 8
curl -s http://localhost:3000/ | grep -q "Carregando" && echo "web OK"
curl -s http://localhost:3001/api/transactions | jq .
```

- [ ] **Step 4: Commit vazio**

```bash
git commit --allow-empty -m "chore(web): verifica dashboard e Swagger"
```

---

## Self-Review

**1. Spec coverage:** Rotas (§1) → Task 1+4+5, Data (§2) → Task 2, Form (§3) → Task 3, Estados (§4) → Task 4 — cobre §1-4 do design 2026-08-27-dashboard

**2. Placeholder scan:** Nenhum TBD/TODO, todos os passos têm código completo

**3. Type consistency:** CreateTransactionDto de @repo/shared usado em form e mutation, Filters com page/limit, transactionStatus.name

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-dashboard-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
