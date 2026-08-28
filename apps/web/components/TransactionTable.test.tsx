import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionTable } from './TransactionTable.js';
describe('TransactionTable', () => {
  it('loading', () => { render(<TransactionTable isLoading />); expect(screen.getByRole('status')).toBeInTheDocument(); });
  it('error', () => { render(<TransactionTable isError />); expect(screen.getByRole('alert')).toBeInTheDocument(); });
  it('empty', () => { render(<TransactionTable data={[]} />); expect(screen.getByRole('status', { name:/nenhuma/i })).toBeInTheDocument(); });
  it('data com PENDING', () => { render(<TransactionTable data={[{ transactionExternalId:'x', transactionType:{name:'PIX'}, transactionStatus:{name:'PENDING'}, value:120, createdAt:'2026-08-27T00:00:00.000Z' }]} />); expect(screen.getByRole('cell', {name:/PENDING/i})).toBeInTheDocument(); });
});
