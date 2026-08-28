# Design — Dashboard Moderno com Métricas e Gráficos (feat/dashboard-modern)

**Data:** 2026-08-28  
**Status:** Aprovado (brainstorming §1-4)  
**Base:** Design 2026-08-27-dashboard (App Router + polling) + 2026-08-26 listagem (offset) — este spec moderniza UI sem fugir do foco (listagem paginada, filtros, detalhe, criação, PENDING polling)  
**Stack:** Node 24 LTS + pnpm + Next.js 15 App Router + React 19 + Tailwind 4 + Tremor 3 + Recharts + TanStack Query 5 + Zustand 5 + react-hook-form + Zod + Vitest + Testing Library + Playwright  
**Visual:** http://localhost:55795 (dashboard-modern-options.html) com wireframe 3 cards + Donut + Bar + tabela

---

## 1. Layout e Estrutura (Seção 1 aprovada)

**App Router (mantém rotas já existentes):**

- `app/layout.tsx` — `html` + `body` com `Tailwind` `bg-slate-50`, `providers.tsx` com `QueryClientProvider` + `Zustand`, `header` com `BIUD Dashboard` + `nav` (`Dashboard` | `Nova transação`) e `footer`
- `app/page.tsx` (`/`) — grid `Tailwind` `grid-cols-1 lg:grid-cols-3` para **3 Cards métricas** no topo, `grid-cols-1 lg:grid-cols-2` para **2 gráficos** abaixo, e `Card` full-width para **tabela** com `Filters` + `Pagination` no `Card` header/footer
- `app/globals.css` — mantém `@tailwind base/components/utilities`, adiciona `* { scrollbar-width: thin }`

**Alternativa descartada:** manter `app/page.tsx` sem `Card` e sem `grid` (atual tenebroso, sem corpo).

---

## 2. Métricas e Gráficos com Tremor (Seção 2 aprovada, Context7 validado)

**Dependências (Tremor usa Recharts por baixo, Tailwind+Radix):**

```bash
pnpm --filter @repo/web add @tremor/react
```

**Componentes novos (`apps/web/components/dashboard/`):**

- **`MetricCards.tsx` (3 `Card` + `Metric` + `Badge`):**

  ```tsx
  'use client';
  import { Card, Metric, Text, Badge } from '@tremor/react';
  import { useTransactions } from '../../lib/api/transactions.js';
  import { useFilterStore } from '../../stores/filter-store.js';
  export function MetricCards() {
    const filters = useFilterStore();
    const { data } = useTransactions({ ...filters, page:1, limit:1 });
    const pending = useTransactions({ ...filters, status:'PENDING', page:1, limit:1 });
    const approved = useTransactions({ ...filters, status:'APPROVED', page:1, limit:1 });
    const rejected = useTransactions({ ...filters, status:'REJECTED', page:1, limit:1 });
    const total = data?.meta.total ?? 0;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-amber-50"><Text>Pendentes</Text><Metric>{pending.data?.meta.total ?? 0}</Metric><Badge color="amber">Polling 3s</Badge></Card>
        <Card className="bg-emerald-50"><Text>Aprovadas</Text><Metric>{approved.data?.meta.total ?? 0}</Metric><Badge color="emerald">{approved.data?.meta.total ?? 0} • {total ? Math.round(approved.data.meta.total/total*100) : 0}%</Badge></Card>
        <Card className="bg-red-50"><Text>Rejeitadas</Text><Metric>{rejected.data?.meta.total ?? 0}</Metric><Badge color="red">{rejected.data?.meta.total ?? 0} • {total ? Math.round(rejected.data.meta.total/total*100) : 0}% (>1000)</Badge></Card>
      </div>
    );
  }
  ```

  Reutiliza `GET` paginado com `limit:1` + `meta.total` (sem nova API `stats` para manter foco).

- **`StatusDonut.tsx` (DonutChart):**

  ```tsx
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

- **`VolumeBar.tsx` (BarChart por faixa):**
  ```tsx
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

---

## 3. Tabela Modernizada (Seção 3 aprovada)

**`components/TransactionTable.tsx` (com Tremor `Table` + `Badge`, mantém `getByRole`):**

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
    </Card>
  );
}
```

- `Filters.tsx` modernizado: `Card` com `Select` + `Date` inputs `Tailwind` `border-slate-200` + `Button` `Limpar`
- `Pagination.tsx` modernizado: `Button` `disabled` com `hasNext/hasPrev`, `Text` `Página {page} de {totalPages}`

---

## 4. Integração com API e Testes (Seção 4 aprovada, sem fugir do foco)

**Integração:**

- Métricas e gráficos reutilizam `GET /api/transactions` paginado (`meta.total`) + contagem por status (3 queries com `limit:1` ou `data` já carregado para `VolumeBar`), sem `GET /api/transactions/stats` agora
- Polling mantém `refetchInterval: hasPending?3000:false`
- Proxy `next.config.mjs` já com `rewrites` para `3001`

**Testes:**

- Unit `MetricCards`: `render` com `QueryClientProvider` + `msw` mock `GET /api/transactions?status=PENDING` → `getByText(/Pendentes/i)` + `getByText('12')`
- Unit `StatusDonut`: `render` com `data` → `getByText(/Distribuição/i)`
- E2E `Playwright` (existente): `POST 120 → PENDING` (polling 3s) → `APPROVED` verifica também `MetricCards` `Pendentes` → `0` e `Aprovadas` → `+1`

---

## 5. Sequência e DECISIONS

**Sequência neste slice (`feat/dashboard-modern`):**

1. `Tremor` `Card`/`Metric`/`DonutChart`/`BarChart` + `MetricCards`/`StatusDonut`/`VolumeBar`
2. Modernizar `TransactionTable`/`Filters`/`Pagination` com `Tremor` + `Tailwind`
3. Integrar métricas via `GET` paginado (`meta.total`) + `pnpm quality` verde + `pnpm dev` com `web` 3000
4. `DECISIONS.md` entrada `Dashboard moderno com Tremor`

**DECISIONS.md (novo):**

```md
## Dashboard moderno com Tremor

**Decisão:** Tremor (Card, Metric, Donut, Bar) + Tailwind, métricas via GET paginado limit:1
**Alternativas:** Recharts puro, Chart.js
**Por quê:** Tremor é Tailwind+Radix, Donut/Bar com 1 prop, já usa Recharts, sem CSS manual
```

---

## 6. Riscos e Mitigações

- **4 queries para métricas (total + 3 status) sobrecarrega API:** `limit:1` é leve, `staleTime` 10s, `DECISIONS.md` registra `stats` endpoint como evolução
- **Tremor bundle:** ~50kb, evita 200 linhas CSS manual para parecer moderno
- **Testes sem backend:** mock `fetch` para unit, `Playwright` com `page.request` para e2e

---

## 7. Referências Context7

- `/tremorlabs/tremor` — `Card`, `Metric`, `DonutChart`, `BarChart`
- `/recharts/recharts` — `PieChart`, `BarChart`, `ResponsiveContainer`
- `/chartjs/chart.js` — `Chart` `bar`/`pie` (alternativa descartada)
- `/vercel/next.js` — App Router
- `/pmndrs/zustand` — store

---

_Fim do design Fase modernização. Próximo passo: `writing-plans` para tasks TDD por slice, com `pnpm quality` verde e `pnpm dev` com `web` 3000 moderno._
