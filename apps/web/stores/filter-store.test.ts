import { describe, it, expect } from 'vitest';
import { useFilterStore } from '../stores/filter-store';
describe('filter-store', () => {
  it('set page', () => {
    const { set } = useFilterStore.getState();
    set({ page: 2 });
    expect(useFilterStore.getState().page).toBe(2);
    useFilterStore.getState().reset();
    expect(useFilterStore.getState().page).toBe(1);
  });
});
