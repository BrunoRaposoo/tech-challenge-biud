/* eslint-disable @typescript-eslint/no-explicit-any */
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
