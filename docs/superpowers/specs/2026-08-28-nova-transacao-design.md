# Design — Página Nova Transação Simplificada (feat/nova-transacao)

**Data:** 2026-08-28  
**Status:** Aprovado (brainstorming: opção A + opção A + logo->home)  
**Base:** Dashboard fintech clean (paleta A + Inter) — melhoria pontual da página `/transactions/new`  
**Escopo:** simplificar o formulário e alinhar UI/UX ao dashboard; **sem** nova funcionalidade de negócio.

---

## 1. Objetivo

Fazer a criação de transação ser simples e coerente com o dashboard:

- Form com **um único campo "Valor (R$)"**.
- `accountExternalIdDebit`/`accountExternalIdCredit` e `transferTypeId` ficam **automáticos** no submit (não aparecem na UI).
- Sucesso → redireciona para `/` (dashboard), onde a transação aparece `PENDENTE` e o polling a atualiza.
- Logo/nome "BIUD" no header vira link para `/`.

---

## 2. Form simplificado

**`components/TransactionForm.tsx`:**

- Um `input` controlado (`useState`) do tipo `number`, com prefixo "R$", placeholder "0,00", fonte grande (22px) — estilo fintech.
- Validação do valor com `createTransactionSchema.shape.value` (zod): `number().positive()`; erro exibido como `role="alert"` abaixo do campo.
- Submit monta o DTO completo:
  ```ts
  const dto = {
    accountExternalIdDebit: newUuid(),
    accountExternalIdCredit: newUuid(),
    transferTypeId: 1, // PIX (seed id 1)
    value,
  };
  mutate(dto, { onSuccess: () => router.push('/') });
  ```
- Helper `newUuid()` (module-local) com `crypto.randomUUID` + fallback (para ambiente de teste jsdom).
- Botão "Criar transação" índigo (`bg-brand`) full-width; texto de apoio "Valores acima de R$ 1.000 são rejeitados automaticamente.".

**`lib/api/transactions.ts` (`useCreateTransaction`):** mantém `onMutate` (optimistic `PENDING`) e `onSettled` (`invalidateQueries`); o `onSuccess` da navegação é passado no `mutate`.

---

## 3. Sucesso

- `mutate(dto, { onSuccess: () => router.push('/') })`.
- A transação aparece no topo da listagem como `PENDENTE` (já inserida pelo optimistic update) e o polling (`refetchInterval` 3s) a atualiza para `APROVADA`/`REJEITADA`.

---

## 4. Header logo -> home

- `app/layout.tsx`: envolver o bloco logo (quadrado "B" + "BIUD Dashboard") em `<a href="/">` mantendo o estilo; CTA "+ Nova transação" continua para `/transactions/new`.

---

## 5. Testes

- Atualizar `components/TransactionForm.test.tsx`: verificar render do campo "Valor (R$)" e do botão "Criar transação" (`getByRole('button', { name: /criar/i })`) em vez do placeholder `accountExternalIdDebit`.
- Opcional: teste de validação — valor vazio/inválido exibe `role="alert"`.
- Manter `pnpm quality` verde.

---

## 6. Fora de escopo

- Não altera `createTransactionSchema` (backend continua validando uuid).
- Não adiciona select de tipo (só PIX). Não adiciona tela de confirmação.
