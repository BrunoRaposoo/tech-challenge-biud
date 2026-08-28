'use client';
import { Card, BarChart, Title } from '@tremor/react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VolumeBar({ data }: { data: any[] }) {
  return (
    <Card className="rounded-xl border border-[#E2E8F0] shadow-sm">
      <Title className="font-semibold text-ink">Volume por Faixa (R$)</Title>
      <BarChart
        data={data}
        index="faixa"
        categories={['count']}
        colors={['#4F46E5']}
        showTooltip
        showLegend={false}
      />
    </Card>
  );
}
