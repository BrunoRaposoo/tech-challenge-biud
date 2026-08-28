'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFilterStore } from '../stores/filter-store';
export function Filters() {
  const { status, set, reset } = useFilterStore();
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Status
          </span>
          <select
            value={status ?? ''}
            onChange={(e) => set({ status: (e.target.value as any) || undefined })}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Rejeitada</option>
          </select>
        </label>
        <button
          onClick={() => reset()}
          className="self-start rounded-lg bg-grafite px-4 py-2 text-sm font-medium text-white hover:bg-grafite-800 sm:self-end"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
