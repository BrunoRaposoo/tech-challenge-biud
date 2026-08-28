import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('TransactionForm', () => {
  it('renderiza campo valor e botao criar', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionForm />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar transação/i })).toBeInTheDocument();
  });
});
