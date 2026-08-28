'use client';
import { useStatusMetrics } from '../../lib/hooks/useStatusMetrics';
import { StatusPill } from '../StatusPill';
function Kpi({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {status ? <StatusPill status={status} /> : null}
      </div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-faint">{sub}</div> : null}
    </div>
  );
}
export function MetricCards() {
  const m = useStatusMetrics();
  const pct = (n: number) => (m.total ? Math.round((n / m.total) * 100) : 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Kpi label="Pendentes" value={String(m.pending)} sub="atualiza a cada 3s" status="PENDING" />
      <Kpi
        label="Aprovadas"
        value={`${pct(m.approved)}%`}
        sub={`${m.approved} transações`}
        status="APPROVED"
      />
      <Kpi
        label="Rejeitadas"
        value={`${pct(m.rejected)}%`}
        sub={`${m.rejected} acima de R$ 1.000`}
        status="REJECTED"
      />
    </div>
  );
}
