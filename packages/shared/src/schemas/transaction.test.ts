import { describe, it, expect } from 'vitest';
import { createTransactionSchema } from './transaction';
describe('createTransactionSchema', () => {
  it('rejeita value negativo', () => {
    expect(() =>
      createTransactionSchema.parse({
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        transferTypeId: 1,
        value: -10,
      }),
    ).toThrow();
  });
  it('aceita payload valido', () => {
    expect(() =>
      createTransactionSchema.parse({
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        transferTypeId: 1,
        value: 120,
      }),
    ).not.toThrow();
  });
});
