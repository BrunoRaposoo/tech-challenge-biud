import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsController', () => {
  it('delega para service', async () => {
    const mockService = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      create: async (dto: any) => ({
        transactionExternalId: 'x',
        transactionStatus: { name: 'PENDING' },
      }),
      findOne: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const mod = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    }).compile();
    const ctrl = mod.get(TransactionsController);
    const result = await ctrl.create({
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      transferTypeId: 1,
      value: 120,
    });
    expect(result.transactionStatus.name).toBe('PENDING');
  });
});
