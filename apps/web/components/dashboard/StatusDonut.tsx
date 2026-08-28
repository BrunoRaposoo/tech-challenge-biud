'use client';
import { Card, DonutChart, Title } from '@tremor/react';
export function StatusDonut({
  pending,
  approved,
  rejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const data = [
    { name: 'Pendentes', value: pending },
    { name: 'Aprovadas', value: approved },
    { name: 'Rejeitadas', value: rejected },
  ];
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <Title className="font-semibold text-ink">Distribuição por Status</Title>
      <DonutChart
        data={data}
        colors={['#F59E0B', '#10B981', '#EF4444']}
        showTooltip
        variant="donut"
      />
    </Card>
  );
}
