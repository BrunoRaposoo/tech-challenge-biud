import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateTransactionDto } from '@repo/shared';
import type { Filters } from '../../stores/filter-store';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TransactionItem = {
  transactionExternalId: string;
  transactionType: { name: string };
  transactionStatus: { name: TransactionStatus };
  value: number;
  createdAt: string;
};

export type TransactionList = {
  data: TransactionItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export const useTransactions = (filters: Filters) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'function',
    ),
  );
  return useQuery<TransactionList>({
    queryKey: ['transactions', filters],
    queryFn: () =>
      fetch(
        `/api/transactions?${new URLSearchParams(cleanFilters as Record<string, string>)}`,
      ).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json() as Promise<TransactionList>;
      }),
    refetchInterval: (q) =>
      q.state.data?.data.some((t) => t.transactionStatus.name === 'PENDING') ? 3000 : false,
    refetchIntervalInBackground: false,
  });
};
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
    mutationFn: async (dto: CreateTransactionDto) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Não foi possível criar a transação.');
      }
      return res.json();
    },
    onMutate: async (newTx) => {
      // Cancela refetches em voo para não sobrescrever o update otimista.
      await qc.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot das queries existentes (todas as chaves ['transactions', ...]).
      const previous = qc.getQueriesData<TransactionList>({ queryKey: ['transactions'] });

      const optimistic = {
        transactionExternalId: `pendente-${Date.now()}`,
        transactionType: { name: 'PIX' },
        transactionStatus: { name: 'PENDING' as const },
        value: newTx.value,
        createdAt: new Date().toISOString(),
      };

      qc.setQueriesData<TransactionList>({ queryKey: ['transactions'] }, (old) => ({
        data: [optimistic, ...(old?.data ?? [])],
        meta: old?.meta ?? {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }));

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Reverte cada query para o snapshot anterior em caso de falha.
      const previous = context?.previous ?? [];
      for (const [key, data] of previous) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
};
