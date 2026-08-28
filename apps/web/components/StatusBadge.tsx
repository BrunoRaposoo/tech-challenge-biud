export function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'PENDING' ? 'bg-yellow-100' : status === 'APPROVED' ? 'bg-green-100' : 'bg-red-100';
  return (
    <span className={`${color} px-2 py-1 rounded`} aria-label={status}>
      {status}
    </span>
  );
}
