import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsService', () => {
  let service: TransactionsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kafka: any;

  beforeEach(() => {
    prisma = {
      transactionType: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'PIX' }),
      },
      transaction: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            transactionExternalId: '550e8400-e29b-41d4-a716-446655440000',
            accountExternalIdDebit: data.accountExternalIdDebit,
            accountExternalIdCredit: data.accountExternalIdCredit,
            transferTypeId: data.transferTypeId,
            value: data.value,
            status: 'PENDING',
            createdAt: new Date('2026-08-26T00:00:00.000Z'),
            type: { name: 'PIX' },
          }),
        ),
        findUnique: vi.fn().mockResolvedValue({
          transactionExternalId: '550e8400-e29b-41d4-a716-446655440000',
          value: 120,
          status: 'PENDING',
          createdAt: new Date(),
          type: { name: 'PIX' },
        }),
      },
    };
    kafka = {
      emitCreated: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn().mockResolvedValue(undefined),
    };
    service = new TransactionsService(prisma, kafka);
  });

  it('cria transacao com status PENDING e publica evento', async () => {
    const result = await service.create({
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      transferTypeId: 1,
      value: 120,
    });
    expect(result.transactionStatus.name).toBe('PENDING');
    expect(result.value).toBe(120);
    expect(kafka.emitCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionExternalId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
  });

  it('lança NotFound se tipo nao existe', async () => {
    prisma.transactionType.findUnique.mockResolvedValue(null);
    await expect(
      service.create({
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        transferTypeId: 99,
        value: 120,
      }),
    ).rejects.toThrow();
  });

  it('findOne retorna transacao', async () => {
    const result = await service.findOne('550e8400-e29b-41d4-a716-446655440000');
    expect(result.transactionExternalId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('findOne lança 404 se nao existe', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nao-existe')).rejects.toThrow();
  });
});
