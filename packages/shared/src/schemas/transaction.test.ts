import { describe, it, expect } from 'vitest';
import { createTransactionSchema, listTransactionsQuerySchema } from './transaction';
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
describe('listTransactionsQuerySchema', () => {
  it('page default 1, limit default 10', () => {
    const parsed = listTransactionsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });
  it('rejeita status invalido', () => {
    expect(() => listTransactionsQuerySchema.parse({ status: 'INVALID' })).toThrow();
  });
  it('coerce type string para number', () => {
    const parsed = listTransactionsQuerySchema.parse({ type: '1' });
    expect(parsed.type).toBe(1);
  });
  it('rejeita from > to', () => {
    expect(() =>
      listTransactionsQuerySchema.parse({
        from: '2026-08-27T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
  it('rejeita limit >50', () => {
    expect(() => listTransactionsQuerySchema.parse({ limit: 100 })).toThrow();
  });
});
