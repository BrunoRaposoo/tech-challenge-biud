'use client';
import { useFilterStore } from '../stores/filter-store';
export function Pagination({
  meta,
}: {
  meta?:
    | {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      }
    | undefined;
}) {
  const { set } = useFilterStore();
  if (!meta) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:justify-between">
      <span className="text-sm text-ink-muted">
        Página {meta.page} de {meta.totalPages} · {meta.total} transações
      </span>
      <div className="flex gap-2">
        <button
          disabled={!meta.hasPrev}
          onClick={() => set({ page: meta.page - 1 })}
          className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          disabled={!meta.hasNext}
          onClick={() => set({ page: meta.page + 1 })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
