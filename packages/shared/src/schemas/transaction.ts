import { z } from 'zod';
export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int().positive(),
  value: z
    .number()
    .positive()
    .max(9999999999)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
      message: 'value deve ter no máximo 2 casas decimais',
    }),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export const transactionCreatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(),
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int(),
  value: z.number(),
  createdAt: z.string().datetime(),
});
export const transactionStatusUpdatedEventSchema = z.object({
  transactionExternalId: z.string().uuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  evaluatedAt: z.string().datetime(),
});
export const listTransactionsQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    type: z.coerce.number().int().positive().optional(),
    from: z.string().datetime({ message: 'from deve ser ISO datetime' }).optional(),
    to: z.string().datetime({ message: 'to deve ser ISO datetime' }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((data) => !data.from || !data.to || new Date(data.from) <= new Date(data.to), {
    message: 'from deve ser <= to',
    path: ['from'],
  });
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
