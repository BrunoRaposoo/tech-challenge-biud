import { createTransactionSchema } from '@repo/shared';
import { z } from 'zod';

export const createTransactionDtoSchema = createTransactionSchema;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
