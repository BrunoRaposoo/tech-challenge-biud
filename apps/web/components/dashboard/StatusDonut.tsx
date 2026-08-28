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
    <Card>
      <Title>Distribuição por Status</Title>
      <DonutChart data={data} colors={['amber', 'emerald', 'red']} showTooltip />
    </Card>
  );
}
