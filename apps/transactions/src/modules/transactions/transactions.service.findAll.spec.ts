import { describe, it, expect, vi } from 'vitest';
import { TransactionsService } from './transactions.service.js';
describe('TransactionsService.findAll', () => {
  it('monta where com status/type/from/to e skip/take', async () => {
    const prisma = {
      transaction: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            {
              transactionExternalId: 'x',
              value: 120,
              status: 'PENDING',
              createdAt: new Date(),
              type: { name: 'PIX' },
            },
          ]),
        count: vi.fn().mockResolvedValue(20),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new TransactionsService(prisma, { emitCreated: async () => {} } as any);
    const result = await svc.findAll({
      status: 'PENDING',
      type: 1,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-08-27T00:00:00.000Z',
      page: 2,
      limit: 10,
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING', transferTypeId: 1 }),
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 20,
      totalPages: 2,
      hasNext: false,
      hasPrev: true,
    });
    expect(result.data[0].transactionStatus.name).toBe('PENDING');
  });
  it('sem filtros retorna tudo com page 1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = {
      transaction: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new TransactionsService(prisma, {} as any);
    const result = await svc.findAll({ page: 1, limit: 10 });
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(1);
  });
});
