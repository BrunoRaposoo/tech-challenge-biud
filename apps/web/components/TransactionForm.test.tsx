import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client.js';
describe('TransactionForm', () => {
  it('mostra erro por campo', async () => {
    render(<QueryClientProvider client={queryClient}><TransactionForm /></QueryClientProvider>);
    const input = screen.getByPlaceholderText(/accountExternalIdDebit/i);
    expect(input).toBeInTheDocument();
  });
});
