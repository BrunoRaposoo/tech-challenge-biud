'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card } from '@tremor/react';
import { useFilterStore } from '../stores/filter-store';
export function Filters() {
  const { status, set, reset } = useFilterStore();
  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={status ?? ''}
          onChange={(e) => set({ status: (e.target.value as any) || undefined })}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button
          onClick={() => reset()}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        >
          Limpar
        </button>
      </div>
    </Card>
  );
}
