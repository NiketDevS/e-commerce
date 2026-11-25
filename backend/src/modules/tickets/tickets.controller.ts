import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ticketService } from './tickets.service';
import {
  createTicketSchema,
  updateTicketCustomerSchema,
  updateTicketStaffSchema,
  listTicketsQuerySchema,
} from './tickets.schema';
import { sendSuccess, sendError } from '../../utils/apiResponse';

// ── Customer Handlers ─────────────────────────────────────────────────────────

export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const ticket = await ticketService.createTicket(req.user!.userId, parsed.data);
    sendSuccess(res, ticket, 201);
  } catch (err) { next(err); }
}

export async function getTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listTicketsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const result = await ticketService.getCustomerTickets(req.user!.userId, parsed.data);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ticket = await ticketService.getCustomerTicket(req.params.id, req.user!.userId);
    sendSuccess(res, ticket);
  } catch (err) { next(err); }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateTicketCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const ticket = await ticketService.updateCustomerTicket(req.params.id, req.user!.userId, parsed.data);
    sendSuccess(res, ticket);
  } catch (err) { next(err); }
}

// ── Staff Handlers ────────────────────────────────────────────────────────────

export async function getStaffTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listTicketsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const result = await ticketService.getAllTickets(parsed.data);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getStaffTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ticket = await ticketService.getStaffTicket(req.params.id);
    sendSuccess(res, ticket);
  } catch (err) { next(err); }
}

export async function updateStaffTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateTicketStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const ticket = await ticketService.updateStaffTicket(req.params.id, parsed.data);
    sendSuccess(res, ticket);
  } catch (err) { next(err); }
}

export async function addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ content: z.string().min(1).max(2000).trim() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const note = await ticketService.addNote(req.params.id, req.user!.userId, parsed.data.content);
    sendSuccess(res, note, 201);
  } catch (err) { next(err); }
}
