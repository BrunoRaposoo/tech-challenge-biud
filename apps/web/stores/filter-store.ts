import { create } from 'zustand';
type Filters = { status?: 'PENDING'|'APPROVED'|'REJECTED'; type?: number; from?: string; to?: string; page: number; limit: number };
export const useFilterStore = create<Filters & { set: (p: Partial<Filters>)=>void; reset: ()=>void }>((set)=>({ page:1, limit:10, set:(p)=>set(p), reset:()=>set({ status:undefined, type:undefined, from:undefined, to:undefined, page:1, limit:10 }) }));
