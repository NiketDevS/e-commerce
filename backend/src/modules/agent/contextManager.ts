import { prisma } from '../../config/prisma';
import type { AgentContextState } from './agent.types';

export class ContextManager {
  async loadContext(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: {
          select: { id: true, orderNumber: true, productName: true, category: true, totalAmount: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!ticket) return null;

    const rawContext = (ticket.agentContext as AgentContextState | null) ?? {};
    const state: AgentContextState = {
      ...rawContext,
      // If ticket is already linked to an order, seed orderNumber into context
      orderNumber: rawContext.orderNumber ?? ticket.order?.orderNumber,
    };

    return { ticket, state };
  }

  async saveContext(ticketId: string, state: AgentContextState): Promise<void> {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { agentContext: state as any },
    });
  }
}

export const contextManager = new ContextManager();
