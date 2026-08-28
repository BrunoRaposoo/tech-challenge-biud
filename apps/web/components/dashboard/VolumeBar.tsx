'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Bucket = { faixa: string; count: number };

export function VolumeBar({ data }: { data: Bucket[] }) {
  const totalZero = data.every((d) => d.count === 0);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">Volume por Faixa (R$)</h3>
      {totalZero ? (
        <div className="py-10 text-center text-xs text-ink-faint">Sem transações para exibir</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="faixa"
              interval={0}
              tick={{ fontSize: '0.875rem', fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: '0.875rem', fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: '#EEF2FF', opacity: 0.4 }}
              contentStyle={{ fontSize: '0.875rem', borderRadius: 8, border: '1px solid #E2E8F0' }}
              formatter={(value) => `${String(value)} transações`}
            />
            <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
