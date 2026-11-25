import { z } from 'zod';

export const createRefundSchema = z.object({
  orderId: z.string().min(1),
  ticketId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number'),
  reason: z.string().min(5).max(500).trim(),
  idempotencyKey: z.string().uuid('idempotencyKey must be a UUID v4'),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
