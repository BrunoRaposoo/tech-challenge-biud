'use client';
import { useFilterStore } from '../stores/filter-store.js';
import { useTransactions } from '../lib/api/transactions.js';
import { TransactionTable } from '../components/TransactionTable.js';
import { Filters } from '../components/Filters.js';
import { Pagination } from '../components/Pagination.js';
export default function Dashboard() {
  const filters = useFilterStore();
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  return <div><Filters /><TransactionTable data={data?.data} isLoading={isLoading} isError={isError} refetch={refetch} /><Pagination meta={data?.meta} /></div>;
}
