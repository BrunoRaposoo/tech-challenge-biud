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
