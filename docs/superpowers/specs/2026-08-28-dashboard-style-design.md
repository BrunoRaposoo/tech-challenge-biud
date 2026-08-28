# Design — Modernização Visual do Dashboard (feat/dashboard-style)

**Data:** 2026-08-28  
**Status:** Aprovado (brainstorming: paleta + layout + tipografia)  
**Base:** Design 2026-08-28-dashboard-modern (Tremor + mobile-first) — este spec trata **somente do visual/CSS/UI-UX**, sem alterar funcionalidades  
**Stack:** Next.js 15 App Router + Tailwind 4 + Tremor 3 + `next/font` (Inter)  
**Restrição:** tema claro único, **sem dark mode**; mobile-first (celular / tablet / desktop)

---

## 1. Paleta — "Fintech Clean" (Stripe / Nubank)

Cor primária de ação e identidade é **índigo**; status financeiro usa verde/âmbar/vermelho.

| Token          | Hex                                          | Uso                                        |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| `grafite`      | `#0F172A`                                    | header, textos de título, botão secundário |
| `índigo`       | `#4F46E5`                                    | CTA primário, links, ids em monospace      |
| `índigo-claro` | `#EEF2FF` / `#C7D2FE`                        | fundo de gráficos, hover                   |
| `esmeralda`    | `#10B981` (fundo `#ECFDF5`, borda `#A7F3D0`) | status APROVADA, delta positivo            |
| `âmbar`        | `#F59E0B` (fundo `#FFF7ED`, borda `#FED7AA`) | status PENDENTE                            |
| `vermelho`     | `#EF4444` (fundo `#FEF2F2`, borda `#FECACA`) | status REJEITADA, delta negativo           |
| `slate`        | `#64748B` / `#94A3B8`                        | textos secundários, labels                 |
| `borda`        | `#E2E8F0`                                    | borda de cards e tabelas                   |
| `fundo`        | `#F8FAFC`                                    | fundo da página                            |

Configurado em `tailwind.config.ts` sob `theme.extend.colors` como tokens semânticos (`brand`, `success`, `warning`, `danger`).

---

## 2. Tailwind Config — tokens

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
        grafite: { DEFAULT: '#0F172A' },
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          700: '#B91C1C',
        },
        ink: { DEFAULT: '#0F172A', muted: '#64748B', faint: '#94A3B8' },
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## 3. Tipografia — Inter (`next/font/google`)

- Fonte primária: `Inter` via `next/font/google`, pesos `400/500/600/700`.
- Monospace (ids/UUID): `ui-monospace`/`SF Mono`.
- `app/layout.tsx` define `className` do `Inter` no `<html>`/`<body>`.
- Escala (mobile-first): título 20px, KPI 28px (peso 700), corpo 13px, label 11px uppercase.

---

## 4. Estrutura / Componentes (reestilização — sem mudar lógica)

**`app/layout.tsx` + `globals.css`:**

- `<body className="bg-[#F8FAFC] text-ink">`.
- Header sticky grafite `#0F172A` com logo (gradiente índigo), nav e CTA "+ Nova transação".
- `globals.css` mantém `@tailwind` + `scrollbar-width: thin`; adiciona `font-smoothing: antialiased`.

**Cards (métricas/gráficos/tabela):**

- Card branco `bg-white border border-[#E2E8F0] rounded-xl shadow-sm` (sombra sutil `0 1px 2px rgba(15,23,42,0.04)`).

**`MetricCards.tsx`:** 3 KPIs com valor peso 700, badge pill por status (`success.50`/`warning.50`/`danger.50` + borda + texto forte), delta percentual + seta.

**`StatusBadge`/tabela:** badge pill `border-radius:999px` por status; linha com `hover:bg-slate-50`; id em monospace índigo `brand.600`.

**`Filters.tsx` / `Pagination.tsx`:** select/inputs `border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm`, botão `Limpar` grafite, paginação com botões secundário/primário índigo.

**Gráficos (Donut/Bar):** cores do Tremor mapeadas para `brand`/`success`/`warning` (donut), `brand.50→brand.700` (bar).

**Mobile-first:** métricas `grid-cols-1 sm:grid-cols-3`, gráficos `grid-cols-1 lg:grid-cols-2`, tabela `hidden sm:block` + cards `sm:hidden`, container `p-4 sm:p-6`.

---

## 5. Fora de escopo

- Sem dark mode.
- Sem nova funcionalidade; apenas CSS/estilo (cores, fontes, espaçamento, badges, header).
- Tabela continua consumindo `GET /api/transactions` paginado com `meta`; gráficos seguem usando os dados já carregados.

---

## 6. Sequência

1. `tailwind.config.ts` com tokens de cor + `next/font` (Inter) em `layout.tsx`.
2. Header + `globals.css` de base (fundo/cor/texto).
3. Reestilizar `MetricCards`, `StatusDonut`/`VolumeBar`, `TransactionTable`, `Filters`, `Pagination`.
4. `pnpm quality` verde + `pnpm dev` com `web` 3000/`transactions` 3001/`anti-fraud` 3002; teste responsivo 375/768/1024px.

---

## 7. Referências

- Tendência visual Stripe / Nubank (fintech clean) — decisão subjetiva validada com o usuário nesta sessão.
- `next/font/google` (Inter) — documentação Next.js.
- Tremor + Tailwind já implementados na branch `feat/dashboard-modern`.
