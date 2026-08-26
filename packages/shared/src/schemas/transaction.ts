import { z } from "zod";
export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.string().uuid(),
  accountExternalIdCredit: z.string().uuid(),
  transferTypeId: z.number().int().positive(),
  value: z.number().positive().max(9999999999),
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
  status: z.enum(["APPROVED", "REJECTED"]),
  evaluatedAt: z.string().datetime(),
});
