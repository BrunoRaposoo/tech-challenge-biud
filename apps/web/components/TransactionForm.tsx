'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { CreateTransactionDto } from '@repo/shared';
import { useCreateTransaction } from '../lib/api/transactions';

const valueSchema = z.object({
  value: z.number().positive({ message: 'Informe um valor maior que zero' }),
});

function newUuid(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function TransactionForm() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateTransaction();
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = valueSchema.safeParse({ value: Number(value) });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Valor inválido');
      return;
    }
    const dto: CreateTransactionDto = {
      accountExternalIdDebit: newUuid(),
      accountExternalIdCredit: newUuid(),
      transferTypeId: 1,
      value: parsed.data.value,
    };
    mutate(dto, { onSuccess: () => router.push('/') });
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold text-ink">Nova transação</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Informe o valor. Contas e tipo são preenchidos automaticamente (PIX).
      </p>
      <form onSubmit={onSubmit} aria-label="Criar transação" className="mt-5">
        <label
          htmlFor="valor"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted"
        >
          Valor (R$)
        </label>
        <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-white px-4 focus-within:border-brand">
          <span className="font-semibold text-ink">R$</span>
          <input
            id="valor"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setFieldError(null);
            }}
            placeholder="0,00"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? 'valor-error' : undefined}
            className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-ink outline-none"
          />
        </div>
        {fieldError && (
          <span id="valor-error" role="alert" className="mt-1.5 block text-sm text-danger">
            {fieldError}
          </span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Criando…' : 'Criar transação'}
        </button>
        {error && (
          <div role="alert" className="mt-3 text-sm text-danger">
            {typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message: unknown }).message)
              : 'Não foi possível criar a transação.'}
          </div>
        )}
      </form>
      <p className="mt-4 text-center text-xs text-ink-faint">
        Valores acima de R$ 1.000 são rejeitados automaticamente.
      </p>
    </div>
  );
}
