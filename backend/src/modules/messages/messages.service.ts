import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export class MessageService {
  /**
   * Saves a message to a ticket. Verifies ownership for CUSTOMER senderType.
   * Returns the saved message.
   */
  async saveMessage(params: {
    ticketId: string;
    senderType: 'CUSTOMER' | 'AI' | 'SUPPORT_AGENT' | 'SYSTEM';
    content: string;
    requestingUserId: string;
  }) {
    // Verify ticket exists and belongs to customer (for CUSTOMER messages)
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: { id: true, customerId: true, status: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    // Customers can only post to their own tickets
    if (params.senderType === 'CUSTOMER' && ticket.customerId !== params.requestingUserId) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND'); // 404 not 403 — don't reveal existence
    }

    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new AppError('Cannot add messages to a closed ticket', 400, 'TICKET_CLOSED');
    }

    return prisma.message.create({
      data: {
        ticketId: params.ticketId,
        senderType: params.senderType,
        content: params.content,
      },
    });
  }

  /**
   * Returns all messages for a ticket.
   * For customers: verifies ownership.
   * For staff: no ownership check (all tickets visible).
   * NEVER returns TicketNotes.
   */
  async getMessages(ticketId: string, requestingUserId: string, role: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, customerId: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    // Customers can only read their own ticket messages
    if (role === 'CUSTOMER' && ticket.customerId !== requestingUserId) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    return prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const messageService = new MessageService();
