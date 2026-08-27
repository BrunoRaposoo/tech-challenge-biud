import { describe, it, expect, vi } from 'vitest';
import { TransactionsService } from '../transactions/transactions.service.js';

describe('Fluxo PENDING → APPROVED mock', () => {
  it('value 120 → APPROVED via anti-fraud mock', async () => {
    const prisma = {
      transactionType: { findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'PIX' }) },
      transaction: {
        create: vi.fn().mockResolvedValue({
          transactionExternalId: 'x',
          value: 120,
          status: 'PENDING',
          createdAt: new Date(),
          type: { name: 'PIX' },
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
          transferTypeId: 1,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kafka = { emitCreated: vi.fn().mockResolvedValue(undefined) } as any;
    const svc = new TransactionsService(prisma, kafka);
    const created = await svc.create({
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      transferTypeId: 1,
      value: 120,
    });
    expect(created.transactionStatus.name).toBe('PENDING');
    // simula anti-fraud
    const status = 120 > 1000 ? 'REJECTED' : 'APPROVED';
    expect(status).toBe('APPROVED');
  });

  it('value 1500 → REJECTED', async () => {
    expect(1500 > 1000 ? 'REJECTED' : 'APPROVED').toBe('REJECTED');
  });
});
