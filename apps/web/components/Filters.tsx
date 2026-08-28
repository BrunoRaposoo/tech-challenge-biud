'use client';
import { useFilterStore } from '../stores/filter-store.js';
export function Filters() {
  const { status, type, from, to, page, limit, set, reset } = useFilterStore();
  return <div><select value={status ?? ''} onChange={e=>set({ status: e.target.value as any || undefined })}><option value="">Todos status</option><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option></select><button onClick={()=>reset()}>Limpar</button></div>;
}
