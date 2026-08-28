# Nova Transação Simplificada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Simplificar `/transactions/new` para um único campo "Valor (R$)" com estilo fintech, auto-gerar contas/tipo, redirecionar ao dashboard no sucesso e tornar o logo do header um link para `/`.

**Architecture:** `TransactionForm` deixa de usar react-hook-form (overkill para 1 campo) e passa a `useState` + validação com `createTransactionSchema.shape.value`; monta o `CreateTransactionDto` com `newUuid()` e `transferTypeId: 1`; `mutate(dto, { onSuccess: () => router.push('/') })`.

**Tech Stack:** Next 15, React 19, Tailwind, TanStack Query, Zod, Vitest, Testing Library.

---

## File Structure

```
apps/web/components/TransactionForm.tsx (reescrever)
apps/web/components/TransactionForm.test.tsx (atualizar teste)
apps/web/app/layout.tsx (logo -> link)
```

### Task 1: Reescrever TransactionForm (1 campo)

- [ ] Substituir por `useState` + `zod` `value`, input "Valor (R$)", botão índigo "Criar transação", `newUuid()` para contas, `transferTypeId: 1`, `mutate(dto, { onSuccess })` com `router.push('/')`.

### Task 2: Atualizar teste

- [ ] `TransactionForm.test.tsx`: mock `next/navigation` (`useRouter`), verificar `getByLabelText(/valor/i)` e `getByRole('button', { name: /criar transação/i })`.

### Task 3: Logo -> link

- [ ] `app/layout.tsx`: envolver logo em `<a href="/">`.

### Task 4: Verificar

- [ ] `pnpm --filter @repo/web test -- --run` + `pnpm quality` EXIT:0; push/PR após aprovação manual.

## Execution Handoff

Plan completo. Opções: **1. Subagent-Driven** ou **2. Inline Execution**.
