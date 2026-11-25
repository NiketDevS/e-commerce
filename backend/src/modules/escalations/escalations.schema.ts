import { z } from 'zod';

export const listEscalationsQuerySchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const escalationDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFO']),
  note: z.string().max(2000).trim().optional(),
});

export type EscalationDecisionInput = z.infer<typeof escalationDecisionSchema>;
