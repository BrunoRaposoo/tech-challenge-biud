'use client';
import { useFilterStore } from '../stores/filter-store';
import { useTransactions } from '../lib/api/transactions';
import { useStatusMetrics } from '../lib/hooks/useStatusMetrics';
import { TransactionTable } from '../components/TransactionTable';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { MetricCards } from '../components/dashboard/MetricCards';
import { StatusDonut } from '../components/dashboard/StatusDonut';
import { VolumeBar } from '../components/dashboard/VolumeBar';
import type { TransactionItem } from '../lib/api/transactions';
function buildBuckets(list: TransactionItem[]) {
  const buckets = [
    { faixa: '0-250', count: 0 },
    { faixa: '250-500', count: 0 },
    { faixa: '500-1000', count: 0 },
    { faixa: '1000-2000', count: 0 },
    { faixa: '2000+', count: 0 },
  ];
  for (const t of list) {
    const v = Number(t.value);
    if (v <= 250) buckets[0]!.count++;
    else if (v <= 500) buckets[1]!.count++;
    else if (v <= 1000) buckets[2]!.count++;
    else if (v <= 2000) buckets[3]!.count++;
    else buckets[4]!.count++;
  }
  return buckets;
}
export default function Dashboard() {
  const { status, type, from, to, page, limit } = useFilterStore();
  const filters = { status, type, from, to, page, limit };
  const { data, isLoading, isError, refetch } = useTransactions(filters);
  const statusMetrics = useStatusMetrics();
  const buckets = buildBuckets(data?.data ?? []);
  return (
    <div className="space-y-4">
      <MetricCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut
          pending={statusMetrics.pending}
          approved={statusMetrics.approved}
          rejected={statusMetrics.rejected}
        />
        <VolumeBar data={buckets} />
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
