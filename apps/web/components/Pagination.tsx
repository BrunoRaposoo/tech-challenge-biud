'use client';
import { Card, Button } from '@tremor/react';
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
    <Card className="p-3">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <span className="text-sm text-slate-500">
          Página {meta.page} de {meta.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!meta.hasPrev}
            onClick={() => set({ page: meta.page - 1 })}
          >
            Anterior
          </Button>
          <Button disabled={!meta.hasNext} onClick={() => set({ page: meta.page + 1 })}>
            Próximo
          </Button>
        </div>
      </div>
    </Card>
  );
}
