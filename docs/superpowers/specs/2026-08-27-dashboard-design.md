# Design — Dashboard Next.js (feat/dashboard-*)

**Data:** 2026-08-27  
**Status:** Aprovado (brainstorming §1-4)  
**Base:** Design 2026-08-26 (Opção A + OpenAPI) + 2026-08-27 anti-fraud + listagem (offset) — este spec detalha §6 Frontend do plano  
**Stack:** Node 24 LTS + pnpm + Next.js 15 App Router + React 19 + Tailwind 4 + TanStack Query 5 + Zustand 5 + react-hook-form 3 + zodResolver + Vitest + Testing Library + Playwright + TypeScript strict  
**Rotas:** `/` (dashboard listagem paginada + filtros), `/transactions/[externalId]` (detalhe), `/transactions/new` (criação) com `loading.tsx`/`error.tsx` por rota

---

## 1. Rotas e Layout (Seção 1 aprovada)

**App Router:**

- `app/layout.tsx` — `html` + `body` com `Tailwind` `globals.css`, `providers.tsx` com `QueryClientProvider` + `Zustand` `FilterStore`
- `app/page.tsx` (`/`) — Dashboard: `Filters` (status/type/from/to), `TransactionTable` (paginada), `Pagination` (`hasNext/hasPrev`, `totalPages`), `useTransactions(filters)` com polling
- `app/transactions/[externalId]/page.tsx` — Detalhe: `useTransaction(externalId)` via `GET /api/transactions/:externalId`, `loading`/`error`/`empty` + `StatusBadge` + `value` + `createdAt`
- `app/transactions/new/page.tsx` — Criação: `TransactionForm` com `useCreateTransaction`, `onSuccess` → `router.push('/')`
- `app/loading.tsx` e `app/error.tsx` globais + por rota `transactions/[externalId]/loading.tsx`

**Alternativa descartada:** tudo em `/` com modais (URL não reflete estado).

---

## 2. Data Layer (Seção 2 aprovada)

**Query Client (`lib/query-client.ts`):**

```ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
```

**Zustand `stores/filter-store.ts` (só filtros, server state no Query):**

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

**API `lib/api/transactions.ts`:**

```ts
export const useTransactions = (filters: Filters) =>
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

- Polling dinâmico validado Context7, pausa sem `PENDING`, sem `WebSocket`
- Proxy: `next.config.mjs` com `rewrites: [{ source:'/api/:path*', destination:'http://localhost:3001/api/:path*' }]` para dev sem CORS

---

## 3. Form Criação (Seção 3 aprovada)

**`components/TransactionForm.tsx`:**

```ts
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTransactionSchema, CreateTransactionDto } from '@repo/shared';
import { useCreateTransaction } from '@/lib/api/transactions';
export function TransactionForm() {
  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<CreateTransactionDto>({ resolver: zodResolver(createTransactionSchema) });
  const { mutate, isPending, error } = useCreateTransaction();
  const onSubmit = (data: CreateTransactionDto) => mutate(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Criar transação">
      <input {...register('accountExternalIdDebit')} aria-invalid={!!errors.accountExternalIdDebit} aria-describedby="debit-error" placeholder="accountExternalIdDebit (uuid)" />
      {errors.accountExternalIdDebit && <span id="debit-error" role="alert">{errors.accountExternalIdDebit.message}</span>}
      {/* accountExternalIdCredit, transferTypeId, value similarly */}
      <button type="submit" disabled={isSubmitting||isPending}>Criar</button>
      {error && <div role="alert">{(error as any).message}</div>}
    </form>
  );
}
```

- Validação `createTransactionSchema` de `@repo/shared` (mesmo do `ZodValidationPipe`), `400` com `errors` por campo, `aria-invalid`
- Navegação `onSuccess` → `router.push('/')`

---

## 4. Estados e Testes (Seção 4 aprovada)

**Estados explícitos (via `getByRole`):**

- `isLoading` → `<div role="status" aria-live="polite">Carregando...</div>` skeleton
- `isError` → `<div role="alert">Erro ao carregar <button onClick={()=>refetch()}>Tentar novamente</button></div>`
- `data.data.length===0` → `<div role="status">Nenhuma transação encontrada <a href="/transactions/new">Criar</a></div>`
- `StatusBadge`: `PENDING` amarelo, `APPROVED` verde, `REJECTED` vermelho, `aria-label`

**Testes:**

- Unit `TransactionTable`: `isLoading` → `getByRole('status')`, `isError` → `getByRole('alert')`, `empty` → `getByRole('status', {name:/nenhuma/i})`, `data` com `PENDING` → `getByRole('cell', {name:/PENDING/i})`
- Unit `TransactionForm`: `zod` `type: 'abc'` → `getByRole('alert')` por campo, `submit` `value:-10` → `getByRole('alert')`
- Unit `useTransactions` polling: mock `query.state.data.data` com `PENDING` → `refetchInterval` 3000, sem `PENDING` → `false`
- E2E Playwright: `POST /api/transactions` via `page.request` → `expect(page.getByRole('cell', {name:'PENDING'}))` → `waitFor` 4s `expect(page.getByRole('cell', {name:'APPROVED'}))` (ou `REJECTED` para `value:1500`)

---

## 5. Sequência e DECISIONS

**Sequência neste slice (`feat/dashboard-*`):**

1. Scaffold `apps/web` (Next.js 15, Tailwind, `lib/query-client`, `stores/filter-store`, `next.config.mjs` proxy)
2. Data layer `TanStack Query` polling + `Zustand` + `lib/api`
3. `TransactionForm` com `RHF`+`Zod`
4. `TransactionTable`/`StatusBadge`/`Pagination`/`Filters` com estados `loading`/`error`/`empty`
5. Testes `getByRole` + `pnpm quality` verde + `pnpm dev` com `shared` + `transactions` + `anti-fraud` + `web` (3000)

**DECISIONS.md (novo):**

```md
## Dashboard polling

**Decisão:** TanStack Query polling dinâmico 3s só com PENDING
**Alternativas:** SWR fixo, revalidação manual, WebSocket
**Por quê:** pausa sem PENDING, sem custo WebSocket para volume baixo
```

---

## 6. Riscos e Mitigações

- **Polling sobrecarrega API:** só com `PENDING`, `limit` max 50, `hasNext` evita páginas vazias
- **CORS em dev:** `next.config.mjs` `rewrites` para `localhost:3001`
- **Testes sem backend:** mock `fetch` para unit, `Playwright` com `page.request` para e2e

---

## 7. Referências Context7

- `/tanstack/query` — `refetchInterval` dinâmico
- `/pmndrs/zustand` — store simples
- `/vercel/next.js` — App Router, `rewrites`
- `/colinhacks/zod` — `zodResolver`

---

_Fim do design Fase 5. Próximo passo: `writing-plans` para tasks TDD por slice, com `pnpm quality` verde e `pnpm dev` com `web` em 3000._
