const MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendente', cls: 'bg-warning-50 text-warning-700 border-warning-200' },
  APPROVED: { label: 'Aprovada', cls: 'bg-success-50 text-success-700 border-success-200' },
  REJECTED: { label: 'Rejeitada', cls: 'bg-danger-50 text-danger-700 border-danger-200' },
};
export function StatusPill({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
