import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCards } from './MetricCards.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/query-client.js';
import { vi } from 'vitest';
vi.mock('../../lib/api/transactions.js', async () => {
  const actual = await vi.importActual('../../lib/api/transactions.js');
  return { ...actual, useTransactions: () => ({ data: { meta: { total: 10 } } }) };
});
describe('MetricCards', () => {
  it('mostra Pendentes', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MetricCards />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Pendentes/i)).toBeInTheDocument();
  });
});
