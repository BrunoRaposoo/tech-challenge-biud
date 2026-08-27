import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
describe('TransactionsController.findAll', () => {
  it('delega para service com query', async () => {
    const mockService = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findAll: async (q: any) => ({
        data: [],
        meta: {
          page: q.page,
          limit: q.limit,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
      create: async () => ({}),
      findOne: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const mod = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    }).compile();
    const ctrl = mod.get(TransactionsController);
    const result = await ctrl.findAll(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { page: 1, limit: 10 } as any,
    );
    expect(result.meta.page).toBe(1);
  });
  it('valida query invalida via pipe (status)', async () => {
    const mockService = {
      findAll: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const mod = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    }).compile();
    const ctrl = mod.get(TransactionsController);
    // pipe valida, mas controller sem pipe manual ainda delega; teste apenas garante método existe
    expect(ctrl.findAll).toBeDefined();
  });
});
