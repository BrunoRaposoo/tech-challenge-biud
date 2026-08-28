'use client';
import { useFilterStore } from '../stores/filter-store';
import { useTransactions } from '../lib/api/transactions';
import { TransactionTable } from '../components/TransactionTable';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { MetricCards } from '../components/dashboard/MetricCards';
import { StatusDonut } from '../components/dashboard/StatusDonut';
import { VolumeBar } from '../components/dashboard/VolumeBar';
export default function Dashboard() {
  const { status, type, from, to, page, limit } = useFilterStore();
  const filters = { status, type, from, to, page, limit };
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pending = 0; // derivado via MetricCards, placeholder
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <MetricCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut pending={0} approved={0} rejected={0} />
        <VolumeBar data={[]} />
      </div>
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
