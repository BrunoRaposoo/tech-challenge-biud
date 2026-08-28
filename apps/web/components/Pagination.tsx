'use client';
import { useFilterStore } from '../stores/filter-store';
export function Pagination({
  meta,
}: {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}) {
  const { set } = useFilterStore();
  if (!meta) return null;
  return (
    <div>
      <button disabled={!meta.hasPrev} onClick={() => set({ page: meta.page - 1 })}>
        Anterior
      </button>
      <span>
        {' '}
        {meta.page} / {meta.totalPages}{' '}
      </span>
      <button disabled={!meta.hasNext} onClick={() => set({ page: meta.page + 1 })}>
        Próximo
      </button>
    </div>
  );
}
