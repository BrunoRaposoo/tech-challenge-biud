# Modernização Visual do Dashboard (Fintech Clean) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestilizar o dashboard com identidade "Fintech Clean" (índigo/grafite + status esmeralda/âmbar/vermelho), fonte Inter, header grafite, cards/badges modernos e mobile-first — mantendo todas as funcionalidades e testes existentes.

**Architecture:** `tailwind.config.ts` ganha tokens de cor; `next/font/google` (Inter) no `layout.tsx`; `StatusPill` substitui Badge do Tremor (pill nativa com nossa paleta); `useStatusMetrics` consolida as contagens já usadas pelos cards para alimentar o donut (evita gráficos vazios); componentes reestilizados com Tailwind puro sobre estrutura já existente.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, Tremor 3 (Card/Donut/Bar/Table), `next/font`, TanStack Query, Zustand, Vitest, Testing Library.

---

## File Structure

```
apps/web/tailwind.config.ts (tokens de cor)
apps/web/app/layout.tsx (Inter + header grafite)
apps/web/app/globals.css (fundo/cor base)
apps/web/app/page.tsx (wire StatusMetrics no donut/bar)
apps/web/lib/hooks/useStatusMetrics.ts (novo, contagens)
apps/web/lib/api/transactions.ts (export type p/ StatusMetric)
apps/web/components/StatusPill.tsx (novo, pill de status)
apps/web/components/dashboard/MetricCards.tsx (reestilizar)
apps/web/components/dashboard/StatusDonut.tsx (reestilizar + cores)
apps/web/components/dashboard/VolumeBar.tsx (reestilizar + cores)
apps/web/components/TransactionTable.tsx (reestilizar)
apps/web/components/Filters.tsx (reestilizar)
apps/web/components/Pagination.tsx (reestilizar)
```

---

### Task 1: Tokens de cor + Inter + header + base

**Files:**

- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Create: `apps/web/app/providers.tsx` (já existe; só layout muda)

- [ ] **Step 1: tailwind.config.ts com tokens**

```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          600: '#4F46E5',
          700: '#4338CA',
        },
        grafite: { DEFAULT: '#0F172A', 800: '#1E293B' },
        success: { DEFAULT: '#10B981', 50: '#ECFDF5', 200: '#A7F3D0', 700: '#047857' },
        warning: { DEFAULT: '#F59E0B', 50: '#FFF7ED', 200: '#FED7AA', 700: '#B45309' },
        danger: { DEFAULT: '#EF4444', 50: '#FEF2F2', 200: '#FECACA', 700: '#B91C1C' },
        ink: { DEFAULT: '#0F172A', muted: '#64748B', faint: '#94A3B8' },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: layout.tsx com Inter + header grafite**

```tsx
import './globals.css';
import { Providers } from './providers';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="min-h-screen bg-[#F8FAFC] text-ink antialiased">
        <header className="sticky top-0 z-10 bg-grafite text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-indigo-400 text-sm font-extrabold">
                B
              </div>
              <span className="font-bold tracking-tight">
                BIUD <span className="text-indigo-300">Dashboard</span>
              </span>
            </div>
            <a
              href="/transactions/new"
              className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + Nova transação
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
* {
  scrollbar-width: thin;
}
html {
  -webkit-text-size-adjust: 100%;
}
```

- [ ] **Step 4: build**

```bash
pnpm --filter @repo/web build
# Expected: next build sem erro, tipografia Inter aplicada
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/app/layout.tsx apps/web/app/globals.css
git commit -m "feat(web): tokens fintech clean, Inter e header grafite"
```

---

### Task 2: StatusPill (substitui Badge do Tremor) + hook useStatusMetrics

**Files:**

- Create: `apps/web/components/StatusPill.tsx`
- Create: `apps/web/lib/hooks/useStatusMetrics.ts`
- Test: `apps/web/components/StatusPill.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// StatusPill.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';
describe('StatusPill', () => {
  it('mapeia PENDING para pt-BR', () => {
    render(<StatusPill status="PENDING" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
  it('mapeia REJECTED', () => {
    render(<StatusPill status="REJECTED" />);
    expect(screen.getByText('Rejeitada')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
pnpm --filter @repo/web test -- --run src/components/StatusPill.test.tsx
# Expected: FAIL (module not found)
```

- [ ] **Step 3: Implement StatusPill**

```tsx
const MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendente', cls: 'bg-warning-50 text-warning-700 border-warning-200' },
  APPROVED: { label: 'Aprovada', cls: 'bg-success-50 text-success-700 border-success-200' },
  REJECTED: { label: 'Rejeitada', cls: 'bg-danger-50 text-danger-700 border-danger-200' },
};
export function StatusPill({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
```

- [ ] **Step 4: Implement useStatusMetrics**

```tsx
'use client';
import { useTransactions } from '../api/transactions';
import { useFilterStore } from '../../stores/filter-store';
export function useStatusMetrics() {
  const { status, type, from, to, page, limit } = useFilterStore();
  const base = { status, type, from, to, page, limit };
  const total = useTransactions({ ...base, page: 1, limit: 1 });
  const pending = useTransactions({ ...base, status: 'PENDING', page: 1, limit: 1 });
  const approved = useTransactions({ ...base, status: 'APPROVED', page: 1, limit: 1 });
  const rejected = useTransactions({ ...base, status: 'REJECTED', page: 1, limit: 1 });
  return {
    total: total.data?.meta.total ?? 0,
    pending: pending.data?.meta.total ?? 0,
    approved: approved.data?.meta.total ?? 0,
    rejected: rejected.data?.meta.total ?? 0,
  };
}
```

- [ ] **Step 5: Run test to pass**

```bash
pnpm --filter @repo/web test -- --run src/components/StatusPill.test.tsx
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/StatusPill.tsx apps/web/components/StatusPill.test.tsx apps/web/lib/hooks/useStatusMetrics.ts
git commit -m "feat(web): StatusPill e hook useStatusMetrics"
```

---

### Task 3: Reestilizar MetricCards (KPI fintech) + StatusDonut + VolumeBar

**Files:**

- Modify: `apps/web/components/dashboard/MetricCards.tsx`
- Modify: `apps/web/components/dashboard/StatusDonut.tsx`
- Modify: `apps/web/components/dashboard/VolumeBar.tsx`

- [ ] **Step 1: MetricCards com useStatusMetrics + pill + delta**

```tsx
'use client';
import { useStatusMetrics } from '../../lib/hooks/useStatusMetrics';
import { StatusPill } from '../StatusPill';
function Kpi({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {status ? <StatusPill status={status} /> : null}
      </div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-faint">{sub}</div> : null}
    </div>
  );
}
export function MetricCards() {
  const m = useStatusMetrics();
  const pct = (n: number) => (m.total ? Math.round((n / m.total) * 100) : 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Kpi label="Pendentes" value={String(m.pending)} sub="atualiza a cada 3s" status="PENDING" />
      <Kpi
        label="Aprovadas"
        value={`${pct(m.approved)}%`}
        sub={`${m.approved} transações`}
        status="APPROVED"
      />
      <Kpi
        label="Rejeitadas"
        value={`${pct(m.rejected)}%`}
        sub={`${m.rejected} acima de R$ 1.000`}
        status="REJECTED"
      />
    </div>
  );
}
```

- [ ] **Step 2: StatusDonut com nossa paleta + legenda**

```tsx
'use client';
import { Card, DonutChart, Title } from '@tremor/react';
export function StatusDonut({
  pending,
  approved,
  rejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const data = [
    { name: 'Pendentes', value: pending },
    { name: 'Aprovadas', value: approved },
    { name: 'Rejeitadas', value: rejected },
  ];
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <Title className="font-semibold text-ink">Distribuição por Status</Title>
      <DonutChart
        data={data}
        colors={['#F59E0B', '#10B981', '#EF4444']}
        showTooltip
        variant="donut"
      />
    </Card>
  );
}
```

- [ ] **Step 3: VolumeBar com cores índigo**

```tsx
'use client';
import { Card, BarChart, Title } from '@tremor/react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VolumeBar({ data }: { data: any[] }) {
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <Title className="font-semibold text-ink">Volume por Faixa (R$)</Title>
      <BarChart
        data={data}
        index="faixa"
        categories={['count']}
        colors={['#4F46E5']}
        showTooltip
        showLegend={false}
      />
    </Card>
  );
}
```

- [ ] **Step 4: Verify tests (MetricCards/StatusDonut ainda passam)**

```bash
pnpm --filter @repo/web test -- --run
# Expected: MetricCards "Pendentes" e StatusDonut "Distribuição" PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/MetricCards.tsx apps/web/components/dashboard/StatusDonut.tsx apps/web/components/dashboard/VolumeBar.tsx
git commit -m "feat(web): KPI fintech e graficos com paleta indigo"
```

---

### Task 4: Reestilizar TransactionTable, Filters, Pagination

**Files:**

- Modify: `apps/web/components/TransactionTable.tsx`
- Modify: `apps/web/components/Filters.tsx`
- Modify: `apps/web/components/Pagination.tsx`

- [ ] **Step 1: TransactionTable com StatusPill + ids monospace**

```tsx
'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from '@tremor/react';
import { StatusPill } from './StatusPill';
export function TransactionTable({
  data,
  isLoading,
  isError,
  refetch,
}: {
  data?: any[];
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}) {
  if (isLoading)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div
          role="status"
          aria-live="polite"
          className="h-32 animate-pulse rounded-lg bg-slate-100"
        />
      </Card>
    );
  if (isError)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div role="alert" className="flex items-center justify-between text-danger">
          <span>Não foi possível carregar as transações.</span>
          <button
            onClick={() => refetch?.()}
            className="rounded-lg bg-grafite px-4 py-2 text-sm font-medium text-white hover:bg-grafite-800"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    );
  if (!data || data.length === 0)
    return (
      <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
        <div
          role="status"
          aria-label="Nenhuma transação encontrada"
          className="py-10 text-center text-ink-muted"
        >
          Nenhuma transação encontrada —{' '}
          <a href="/transactions/new" className="font-medium text-brand underline">
            Criar transação
          </a>
        </div>
      </Card>
    );
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="mx-auto mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Transações recentes</h2>
        <span className="text-xs text-ink-faint">{data.length} exibidas</span>
      </div>
      <div className="hidden sm:block">
        <Table>
          <TableHead>
            <TableRow className="bg-slate-50">
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                ID
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Tipo
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Valor
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Status
              </TableHeaderCell>
              <TableHeaderCell className="text-xs uppercase tracking-wider text-ink-faint">
                Criado
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.transactionExternalId} className="hover:bg-slate-50">
                <TableCell className="font-mono text-brand">
                  {t.transactionExternalId.slice(0, 8)}…
                </TableCell>
                <TableCell>{t.transactionType.name}</TableCell>
                <TableCell className="font-medium">R$ {t.value}</TableCell>
                <TableCell>
                  <StatusPill status={t.transactionStatus.name} />
                </TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 sm:hidden">
        {data.map((t: any) => (
          <div key={t.transactionExternalId} className="rounded-lg border border-[#E2E8F0] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand">
                {t.transactionExternalId.slice(0, 8)}…
              </span>
              <StatusPill status={t.transactionStatus.name} />
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-ink-muted">{t.transactionType.name}</span>
              <span className="font-medium">R$ {t.value}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Filters**

```tsx
'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFilterStore } from '../stores/filter-store';
export function Filters() {
  const { status, set, reset } = useFilterStore();
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Status
          </span>
          <select
            value={status ?? ''}
            onChange={(e) => set({ status: (e.target.value as any) || undefined })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Rejeitada</option>
          </select>
        </label>
        <button
          onClick={() => reset()}
          className="self-start rounded-lg bg-grafite px-4 py-2 text-sm font-medium text-white hover:bg-grafite-800 sm:self-end"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Pagination**

```tsx
'use client';
import { useFilterStore } from '../stores/filter-store';
export function Pagination({
  meta,
}: {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}) {
  const { set } = useFilterStore();
  if (!meta) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:justify-between">
      <span className="text-sm text-ink-muted">
        Página {meta.page} de {meta.totalPages} · {meta.total} transações
      </span>
      <div className="flex gap-2">
        <button
          disabled={!meta.hasPrev}
          onClick={() => set({ page: meta.page - 1 })}
          className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          disabled={!meta.hasNext}
          onClick={() => set({ page: meta.page + 1 })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify tests (TransactionTable estados ainda passam)**

```bash
pnpm --filter @repo/web test -- --run
# Expected: TransactionTable loading/error/empty/data com PENDING PASS (note: data test usa getByRole('cell') — validar)
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/TransactionTable.tsx apps/web/components/Filters.tsx apps/web/components/Pagination.tsx
git commit -m "feat(web): reestiliza tabela, filtros e paginacao fintech"
```

---

### Task 5: Wire dados reais no donut/bar + page.tsx + quality

**Files:**

- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: page.tsx liga useStatusMetrics + buckets ao VolumeBar**

```tsx
'use client';
import { useFilterStore } from '../stores/filter-store';
import { useTransactions } from '../lib/api/transactions';
import { useStatusMetrics } from '../lib/hooks/useStatusMetrics';
import { TransactionTable } from '../components/TransactionTable';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { MetricCards } from '../components/dashboard/MetricCards';
import { StatusDonut } from '../components/dashboard/StatusDonut';
import { VolumeBar } from '../components/dashboard/VolumeBar';
function buildBuckets(list: any[]) {
  const buckets = [
    { faixa: '0-250', count: 0 },
    { faixa: '250-500', count: 0 },
    { faixa: '500-1000', count: 0 },
    { faixa: '1000-2000', count: 0 },
    { faixa: '2000+', count: 0 },
  ];
  for (const t of list) {
    const v = Number(t.value);
    if (v <= 250) buckets[0]!.count++;
    else if (v <= 500) buckets[1]!.count++;
    else if (v <= 1000) buckets[2]!.count++;
    else if (v <= 2000) buckets[3]!.count++;
    else buckets[4]!.count++;
  }
  return buckets;
}
export default function Dashboard() {
  const { status, type, from, to, page, limit } = useFilterStore();
  const filters = { status, type, from, to, page, limit };
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  const statusMetrics = useStatusMetrics();
  const buckets = buildBuckets(data?.data ?? []);
  return (
    <div className="space-y-4">
      <MetricCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut
          pending={statusMetrics.pending}
          approved={statusMetrics.approved}
          rejected={statusMetrics.rejected}
        />
        <VolumeBar data={buckets} />
      </div>
      <Filters />
      <TransactionTable
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
      />
      <Pagination meta={data?.meta} />
    </div>
  );
}
```

- [ ] **Step 2: pnpm quality**

```bash
pnpm quality
# Expected: lint, typecheck, format:check, test, build → EXIT:0
```

- [ ] **Step 3: dev + teste responsivo**

```bash
docker compose up -d
pnpm dev &
sleep 12
curl -s http://localhost:3000/ | grep -q "Pendentes" && echo "OK metrics"
curl -s http://localhost:3000/ | grep -q "Distribuição" && echo "OK donut"
# Browser: 375px / 768px / 1024px
pkill -f "nest start"; pkill -f "next-server"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): liga metricas reais ao donut e bar"
```

---

## Self-Review

**1. Spec coverage:** Paleta (§1) → Task 1, Tailwind tokens (§2) → Task 1, Tipografia (§3) → Task 1, Componentes (§4) → Tasks 2-5, Mobile-first (§4) → Tasks 3-4, Fora de escopo (§5) ok.

**2. Placeholder scan:** Nenhum TBD/TODO; todos os passos têm código completo.

**3. Type consistency:** `StatusPill({status: string})`, `useStatusMetrics()` retorna `{total, pending, approved, rejected}`, `StatusDonut` props `pending/approved/rejected: number`, `VolumeBar` `data: {faixa, count}[]`.

**Nota:** O donut/bar estavam hardcoded em `0`/`[]`; este plano liga os dados reais (mesmos counts já usados pelos cards) para o visual ficar completo, sem mudar nenhuma API.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-28-dashboard-style-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
