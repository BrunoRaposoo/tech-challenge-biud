'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTransactionSchema, CreateTransactionDto } from '@repo/shared';
import { useCreateTransaction } from '../lib/api/transactions';
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
