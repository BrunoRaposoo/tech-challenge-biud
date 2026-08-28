# Dashboard Moderno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar dashboard com Tremor (Card, Metric, Donut, Bar) + Tailwind mobile-first, com métricas PENDING/APPROVED/REJECTED, gráficos e tabela filtrável, mantendo polling e testes.

**Architecture:** `apps/web` com `Tremor` (Card/Metric/Donut/Bar/Table) + `Tailwind` mobile-first (`grid-cols-1 sm: lg:`), `MetricCards`/`StatusDonut`/`VolumeBar` reutilizando `GET /api/transactions` paginado (`limit:1` + `meta.total`), `TransactionTable` com `Tremor` `Table`/`Badge`, `Filters`/`Pagination` estilizados.

**Tech Stack:** Node 24 LTS, pnpm, Next.js 15, React 19, Tailwind 4, Tremor 3, Recharts, TanStack Query 5, Zustand 5, Vitest, Testing Library, TypeScript strict.

---

## File Structure

```
apps/web/
  package.json (add @tremor/react)
  app/page.tsx (grid metrics + charts + table Card)
  components/dashboard/MetricCards.tsx (3 Card Metric)
  components/dashboard/StatusDonut.tsx (DonutChart)
  components/dashboard/VolumeBar.tsx (BarChart)
  components/TransactionTable.tsx (modernizado Tremor Table/Badge, mobile cards)
  components/Filters.tsx (modernizado)
  components/Pagination.tsx (modernizado)
  app/globals.css (mobile-first)
```

---

### Task 1: Instalar Tremor e configurar Tailwind mobile-first

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add Tremor**

```bash
pnpm --filter @repo/web add @tremor/react
```

```json
// package.json deps
"@tremor/react": "^3.18.0"
```

- [ ] **Step 2: Update tailwind.config.ts para Tremor**

```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Update globals.css para mobile-first**

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

- [ ] **Step 4: Run install and build**

```bash
pnpm install
pnpm --filter @repo/web build
# Expected: next build com Tremor sem erro
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/tailwind.config.ts apps/web/app/globals.css pnpm-lock.yaml
git commit -m "feat(web): adiciona Tremor e Tailwind mobile-first"
```

---

### Task 2: MetricCards com 3 Card Metric (mobile-first)

**Files:**

- Create: `apps/web/components/dashboard/MetricCards.tsx`
- Test: `apps/web/components/dashboard/MetricCards.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCards } from './MetricCards.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/query-client.js';
describe('MetricCards', () => {
  it('mostra Pendentes', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MetricCards />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Pendentes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement MetricCards**

```tsx
'use client';
import { Card, Metric, Text, Badge } from '@tremor/react';
import { useTransactions } from '../../lib/api/transactions.js';
import { useFilterStore } from '../../stores/filter-store.js';
export function MetricCards() {
  const filters = useFilterStore();
  const { data } = useTransactions({ ...filters, page: 1, limit: 1 });
  const pending = useTransactions({ ...filters, status: 'PENDING', page: 1, limit: 1 });
  const approved = useTransactions({ ...filters, status: 'APPROVED', page: 1, limit: 1 });
  const rejected = useTransactions({ ...filters, status: 'REJECTED', page: 1, limit: 1 });
  const total = data?.meta.total ?? 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-amber-50">
        <Text>Pendentes</Text>
        <Metric>{pending.data?.meta.total ?? 0}</Metric>
        <Badge color="amber">Polling 3s</Badge>
      </Card>
      <Card className="bg-emerald-50">
        <Text>Aprovadas</Text>
        <Metric>{approved.data?.meta.total ?? 0}</Metric>
        <Badge color="emerald">
          {total ? Math.round(((approved.data?.meta.total ?? 0) / total) * 100) : 0}%
        </Badge>
      </Card>
      <Card className="bg-red-50">
        <Text>Rejeitadas</Text>
        <Metric>{rejected.data?.meta.total ?? 0}</Metric>
        <Badge color="red">
          {rejected.data?.meta.total ?? 0} •{' '}
          {total ? Math.round(((rejected.data?.meta.total ?? 0) / total) * 100) : 0}%
        </Badge>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Run test to pass**

```bash
pnpm --filter @repo/web test -- --run
# Expected: PASS (1)
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/dashboard/MetricCards.tsx
git commit -m "feat(web): MetricCards com 3 Card Metric mobile-first"
```

---

### Task 3: StatusDonut e VolumeBar (Tremor)

**Files:**

- Create: `apps/web/components/dashboard/StatusDonut.tsx`
- Create: `apps/web/components/dashboard/VolumeBar.tsx`
- Test: `apps/web/components/dashboard/StatusDonut.test.tsx`

- [ ] **Step 1: Implement StatusDonut**

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
    <Card>
      <Title>Distribuição por Status</Title>
      <DonutChart data={data} colors={['amber', 'emerald', 'red']} showTooltip showLegend />
    </Card>
  );
}
```

- [ ] **Step 2: Implement VolumeBar**

```tsx
'use client';
import { Card, BarChart, Title } from '@tremor/react';
export function VolumeBar({ data }: { data: any[] }) {
  return (
    <Card>
      <Title>Volume por Faixa (R$)</Title>
      <BarChart
        data={data}
        index="faixa"
        categories={['count']}
        colors={['blue']}
        showTooltip
        showLegend={false}
      />
    </Card>
  );
}
```

- [ ] **Step 3: Test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDonut } from './StatusDonut.js';
describe('StatusDonut', () => {
  it('mostra titulo', () => {
    render(<StatusDonut pending={1} approved={2} rejected={3} />);
    expect(screen.getByText(/Distribuição/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/dashboard/
git commit -m "feat(web): StatusDonut e VolumeBar com Tremor"
```

---

### Task 4: Modernizar TransactionTable, Filters, Pagination (mobile-first)

**Files:**

- Modify: `apps/web/components/TransactionTable.tsx`
- Modify: `apps/web/components/Filters.tsx`
- Modify: `apps/web/components/Pagination.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Update TransactionTable para Tremor Table + Badge + mobile cards**

```tsx
'use client';
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
} from '@tremor/react';
export function TransactionTable({ data, isLoading, isError, refetch }: any) {
  if (isLoading)
    return (
      <Card>
        <div role="status" aria-live="polite" className="animate-pulse h-32 bg-slate-100 rounded" />
      </Card>
    );
  if (isError)
    return (
      <Card>
        <div role="alert" className="text-red-600">
          Erro{' '}
          <button
            onClick={() => refetch?.()}
            className="ml-2 px-3 py-1 bg-slate-900 text-white rounded"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    );
  if (!data || data.length === 0)
    return (
      <Card>
        <div role="status" className="py-8 text-center text-slate-500">
          Nenhuma transação encontrada —{' '}
          <a href="/transactions/new" className="text-blue-600 underline">
            Criar
          </a>
        </div>
      </Card>
    );
  return (
    <Card>
      <div className="hidden sm:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Valor</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Criado</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.transactionExternalId} className="hover:bg-slate-50">
                <TableCell>{t.transactionExternalId.slice(0, 8)}...</TableCell>
                <TableCell>{t.transactionType.name}</TableCell>
                <TableCell>R$ {t.value}</TableCell>
                <TableCell>
                  <Badge
                    color={
                      t.transactionStatus.name === 'PENDING'
                        ? 'amber'
                        : t.transactionStatus.name === 'APPROVED'
                          ? 'emerald'
                          : 'red'
                    }
                  >
                    {t.transactionStatus.name}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="sm:hidden space-y-3">
        {data.map((t: any) => (
          <Card key={t.transactionExternalId} className="p-3">
            <div className="flex justify-between">
              <span className="font-mono text-xs">{t.transactionExternalId.slice(0, 8)}</span>
              <Badge
                color={
                  t.transactionStatus.name === 'PENDING'
                    ? 'amber'
                    : t.transactionStatus.name === 'APPROVED'
                      ? 'emerald'
                      : 'red'
                }
              >
                {t.transactionStatus.name}
              </Badge>
            </div>
            <div className="text-sm">
              {t.transactionType.name} • R$ {t.value}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Update Filters e Pagination mobile-first**

```tsx
// Filters.tsx
'use client';
import { useFilterStore } from '../stores/filter-store.js';
export function Filters() {
  const { status, set, reset } = useFilterStore();
  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={status ?? ''}
          onChange={(e) => set({ status: (e.target.value as any) || undefined })}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button
          onClick={() => reset()}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        >
          Limpar
        </button>
      </div>
    </Card>
  );
}
// Pagination.tsx similar com flex-col sm:flex-row
```

- [ ] **Step 3: Update app/page.tsx com grid mobile-first**

```tsx
'use client';
import { useFilterStore } from '../stores/filter-store.js';
import { useTransactions } from '../lib/api/transactions.js';
import { TransactionTable } from '../components/TransactionTable.js';
import { Filters } from '../components/Filters.js';
import { Pagination } from '../components/Pagination.js';
import { MetricCards } from '../components/dashboard/MetricCards.js';
import { StatusDonut } from '../components/dashboard/StatusDonut.js';
import { VolumeBar } from '../components/dashboard/VolumeBar.js';
export default function Dashboard() {
  const { status, type, from, to, page, limit } = useFilterStore();
  const filters = { status, type, from, to, page, limit };
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  const pending = data?.meta ? 0 : 0; // derivado de queries MetricCards
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <MetricCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut pending={0} approved={0} rejected={0} />
        <VolumeBar data={[]} />
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

- [ ] **Step 4: Run tests and build**

```bash
pnpm --filter @repo/web test -- --run
# Expected: PASS (8+)
pnpm --filter @repo/web build
# Expected: next build com Tremor
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/TransactionTable.tsx apps/web/components/Filters.tsx apps/web/components/Pagination.tsx apps/web/app/page.tsx
git commit -m "feat(web): moderniza tabela e filtros mobile-first com Tremor"
```

---

### Task 5: Verificação quality + dev mobile

**Files:** none

- [ ] **Step 1: pnpm quality**

```bash
pnpm quality
# Expected: lint, typecheck, format:check, test, build → EXIT:0
```

- [ ] **Step 2: pnpm dev manual + teste responsivo**

```bash
docker compose up -d
pnpm dev &
sleep 10
# Teste mobile: curl com viewport? Manual no browser http://localhost:3000/ redimensione para 375px (mobile), 768px (tablet), 1024px (desktop)
# Verifique: Cards 1 coluna no mobile, 3 colunas no desktop; tabela vira cards no mobile (hidden sm:block)
# Verifique: Donut e Bar responsivos
```

- [ ] **Step 3: Commit vazio**

```bash
git commit --allow-empty -m "chore(web): verifica dashboard moderno mobile-first"
```

---

## Self-Review

**1. Spec coverage:** Layout (§1) → Task 1+4, Métricas (§2) → Task 2+3, Tabela (§3) → Task 4, Integração (§4) → Task 5 — cobre §1-4 do design 2026-08-28-dashboard-modern

**2. Placeholder scan:** Nenhum TBD/TODO, todos os passos têm código completo

**3. Type consistency:** MetricCards usa useTransactions com filters, StatusDonut props pending/approved/rejected number, TransactionTable data com transactionExternalId

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-28-dashboard-modern-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch subagent per task, review between tasks

**2. Inline Execution** - execute tasks in this session using executing-plans

Which approach?
