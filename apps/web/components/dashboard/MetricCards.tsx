'use client';
import { Card, Metric, Text, Badge } from '@tremor/react';
import { useTransactions } from '../../lib/api/transactions';
import { useFilterStore } from '../../stores/filter-store';
export function MetricCards() {
  const filters = useFilterStore();
  const { data } = useTransactions({ ...filters, page: 1, limit: 1 });
  const pending = useTransactions({ ...filters, status: 'PENDING', page: 1, limit: 1 });
  const approved = useTransactions({ ...filters, status: 'APPROVED', page: 1, limit: 1 });
  const rejected = useTransactions({ ...filters, status: 'REJECTED', page: 1, limit: 1 });
  const total = data?.meta.total ?? 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-amber-50">
        <Text>Pendentes</Text>
        <Metric>{pending.data?.meta.total ?? 0}</Metric>
        <Badge color="amber">Polling 3s</Badge>
      </Card>
      <Card className="bg-emerald-50">
        <Text>Aprovadas</Text>
        <Metric>{approved.data?.meta.total ?? 0}</Metric>
        <Badge color="emerald">
          {total ? Math.round(((approved.data?.meta.total ?? 0) / total) * 100) : 0}%
        </Badge>
      </Card>
      <Card className="bg-red-50">
        <Text>Rejeitadas</Text>
        <Metric>{rejected.data?.meta.total ?? 0}</Metric>
        <Badge color="red">
          {rejected.data?.meta.total ?? 0} •{' '}
          {total ? Math.round(((rejected.data?.meta.total ?? 0) / total) * 100) : 0}%
        </Badge>
      </Card>
    </div>
  );
}
