import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import type { CreateTicketInput, UpdateTicketCustomerInput, UpdateTicketStaffInput } from './tickets.schema';

const TICKET_SAFE_SELECT = {
  id: true,
  subject: true,
  description: true,
  category: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  orderId: true,
  customerId: true,
} as const;

export class TicketService {
  async createTicket(customerId: string, input: CreateTicketInput) {
    // If orderId provided, verify it belongs to this customer
    if (input.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: input.orderId, customerId },
        select: { id: true },
      });
      if (!order) {
        throw new AppError('Order not found', 404, 'NOT_FOUND');
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        customerId,
        subject: input.subject,
        description: input.description,
        category: input.category,
        orderId: input.orderId ?? null,
      },
      select: TICKET_SAFE_SELECT,
    });

    return ticket;
  }

  async getCustomerTickets(
    customerId: string,
    filters: { status?: string; page: number; limit: number },
  ) {
    const where: Prisma.TicketWhereInput = { customerId };
    if (filters.status) {
      where.status = filters.status as any;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [tickets, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: filters.limit,
        select: {
          ...TICKET_SAFE_SELECT,
          order: { select: { orderNumber: true, productName: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page: filters.page, limit: filters.limit };
  }

  async getCustomerTicket(ticketId: string, customerId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, customerId }, // ownership enforced at DB
      include: {
        order: { select: { id: true, orderNumber: true, productName: true, status: true, deliveryDate: true, totalAmount: true } },
        escalation: { select: { id: true, status: true, decision: true, priority: true } },
        refunds: { select: { id: true, amount: true, status: true, createdAt: true } },
        // Notes are NOT included — they're internal only
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    return ticket;
  }

  async updateCustomerTicket(ticketId: string, customerId: string, input: UpdateTicketCustomerInput) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, customerId },
      select: { id: true, status: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new AppError('Cannot update a resolved or closed ticket', 400, 'TICKET_CLOSED');
    }

    return prisma.ticket.update({
      where: { id: ticketId },
      data: { status: input.status },
      select: TICKET_SAFE_SELECT,
    });
  }

  // ── Staff Methods ──────────────────────────────────────────────────────────

  async getAllTickets(filters: {
    status?: string;
    priority?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.TicketWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.priority) where.priority = filters.priority as any;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [tickets, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: filters.limit,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          order: { select: { orderNumber: true, productName: true } },
          escalation: { select: { id: true, status: true, decision: true, priority: true } },
          _count: { select: { messages: true, notes: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page: filters.page, limit: filters.limit };
  }

  async getStaffTicket(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        order: true,
        messages: { orderBy: { createdAt: 'asc' } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
        escalation: true,
        refunds: true,
      },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    return ticket;
  }

  async updateStaffTicket(ticketId: string, input: UpdateTicketStaffInput) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...(input.status && { status: input.status }),
        ...(input.priority && { priority: input.priority }),
      },
      select: TICKET_SAFE_SELECT,
    });
  }

  async addNote(ticketId: string, authorId: string, content: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    return prisma.ticketNote.create({
      data: { ticketId, authorId, content },
      include: { author: { select: { id: true, name: true } } },
    });
  }
}

export const ticketService = new TicketService();
