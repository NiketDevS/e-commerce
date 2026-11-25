import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  category: z.string().min(2).max(50).trim(),
  orderId: z.string().optional(),
});

export const updateTicketCustomerSchema = z.object({
  status: z.enum(['CLOSED']), // Customers can only close their own tickets
});

export const updateTicketStaffSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const listTicketsQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketCustomerInput = z.infer<typeof updateTicketCustomerSchema>;
export type UpdateTicketStaffInput = z.infer<typeof updateTicketStaffSchema>;
