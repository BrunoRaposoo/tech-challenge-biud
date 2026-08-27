import { describe, it, expect, vi } from 'vitest';
import { KafkaService } from './kafka.service.js';
describe('KafkaService handleStatusUpdated', () => {
  it('updateMany WHERE PENDING idempotente', async () => {
    const prisma = {
      transaction: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as unknown as import('../prisma/prisma.service.js').PrismaService;
    const svc = new KafkaService(prisma);
    await svc.handleStatusUpdated({
      transactionExternalId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'APPROVED',
      evaluatedAt: new Date().toISOString(),
    });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { transactionExternalId: '550e8400-e29b-41d4-a716-446655440000', status: 'PENDING' },
      data: { status: 'APPROVED' },
    });
  });
  it('no-op se já não PENDING', async () => {
    const prisma = {
      transaction: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as import('../prisma/prisma.service.js').PrismaService;
    const svc = new KafkaService(prisma);
    await expect(
      svc.handleStatusUpdated({
        transactionExternalId: 'x',
        status: 'REJECTED',
        evaluatedAt: new Date().toISOString(),
      }),
    ).resolves.not.toThrow();
  });
});
