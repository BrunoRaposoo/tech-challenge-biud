'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const SEGMENTS = [
  { key: 'Pendentes', color: '#F59E0B' },
  { key: 'Aprovadas', color: '#10B981' },
  { key: 'Rejeitadas', color: '#EF4444' },
];

export function StatusDonut({
  pending,
  approved,
  rejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const values = [pending, approved, rejected];
  const data = SEGMENTS.map((s, i) => ({ name: s.key, value: values[i]!, color: s.color }));
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">Distribuição por Status</h3>
      {total === 0 ? (
        <div className="py-10 text-center text-xs text-ink-faint">Sem transações para exibir</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={76}
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="#FFFFFF" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: '0.875rem', borderRadius: 8, border: '1px solid #E2E8F0' }}
              formatter={(value) => `${String(value)} transações`}
            />
            <Legend wrapperStyle={{ fontSize: '0.875rem' }} iconSize={10} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
