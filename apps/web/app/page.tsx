'use client';
import { useFilterStore } from '../stores/filter-store';
import { useTransactions } from '../lib/api/transactions';
import { TransactionTable } from '../components/TransactionTable';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
export default function Dashboard() {
  const filters = useFilterStore();
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  return (
    <div>
      <Filters />
      <TransactionTable
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
      />
      <Pagination meta={data?.meta} />
    </div>
  );
}
