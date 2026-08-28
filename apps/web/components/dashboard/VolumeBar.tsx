'use client';
import { Card, BarChart, Title } from '@tremor/react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VolumeBar({ data }: { data: any[] }) {
  return (
    <Card>
      <Title>Volume por Faixa (R$)</Title>
      <BarChart
        data={data}
        index="faixa"
        categories={['count']}
        colors={['blue']}
        showTooltip
        showLegend={false}
      />
    </Card>
  );
}
