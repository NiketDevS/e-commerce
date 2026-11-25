import { PrismaClient, Role, OrderStatus, TicketStatus, TicketPriority, SenderType, RefundStatus, EscalationDecision } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await hash('password123', 10);
  const [customerA, customerB, agent] = await Promise.all([
    prisma.user.upsert({ where: { email: 'maya@example.com' }, update: {}, create: { id: 'seed-customer-maya', name: 'Maya Patel', email: 'maya@example.com', passwordHash, role: Role.CUSTOMER } }),
    prisma.user.upsert({ where: { email: 'arjun@example.com' }, update: {}, create: { id: 'seed-customer-arjun', name: 'Arjun Rao', email: 'arjun@example.com', passwordHash, role: Role.CUSTOMER } }),
    prisma.user.upsert({ where: { email: 'support@example.com' }, update: {}, create: { id: 'seed-support-agent', name: 'Sam Support', email: 'support@example.com', passwordHash, role: Role.SUPPORT_AGENT } }),
  ]);

  const recentDelivery = new Date();
  recentDelivery.setDate(recentDelivery.getDate() - 3);
  const olderDelivery = new Date();
  olderDelivery.setDate(olderDelivery.getDate() - 30);

  const orderA = await prisma.order.upsert({
    where: { orderNumber: 'ORD-1001' }, update: {},
    create: { id: 'seed-order-1001', customerId: customerA.id, orderNumber: 'ORD-1001', status: OrderStatus.DELIVERED, productName: 'Wireless Headphones', category: 'Electronics', deliveryDate: recentDelivery, totalAmount: '7499.00' },
  });
  const orderB = await prisma.order.upsert({
    where: { orderNumber: 'ORD-1002' }, update: {},
    create: { id: 'seed-order-1002', customerId: customerA.id, orderNumber: 'ORD-1002', status: OrderStatus.DELIVERED, productName: 'Everyday Backpack', category: 'Accessories', deliveryDate: olderDelivery, totalAmount: '2499.00' },
  });
  const orderC = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2001' }, update: {},
    create: { id: 'seed-order-2001', customerId: customerB.id, orderNumber: 'ORD-2001', status: OrderStatus.SHIPPED, productName: 'Desk Lamp', category: 'Home', totalAmount: '3299.00' },
  });

  const ticketA = await prisma.ticket.upsert({
    where: { id: 'seed-ticket-1001' }, update: {},
    create: { id: 'seed-ticket-1001', customerId: customerA.id, orderId: orderA.id, subject: 'Headphones have a damaged ear cup', description: 'The left ear cup arrived cracked.', category: 'return', status: TicketStatus.OPEN, priority: TicketPriority.HIGH },
  });
  const ticketB = await prisma.ticket.upsert({
    where: { id: 'seed-ticket-1002' }, update: {},
    create: { id: 'seed-ticket-1002', customerId: customerA.id, orderId: orderB.id, subject: 'Backpack return window question', description: 'I would like to ask about returning this backpack.', category: 'return', status: TicketStatus.IN_PROGRESS, priority: TicketPriority.MEDIUM },
  });
  const ticketC = await prisma.ticket.upsert({
    where: { id: 'seed-ticket-2001' }, update: {},
    create: { id: 'seed-ticket-2001', customerId: customerB.id, orderId: orderC.id, subject: 'Shipping update', description: 'Can you share the latest shipping update?', category: 'shipping', status: TicketStatus.OPEN, priority: TicketPriority.LOW },
  });

  await prisma.message.upsert({ where: { id: 'seed-message-1001' }, update: {}, create: { id: 'seed-message-1001', ticketId: ticketA.id, senderType: SenderType.CUSTOMER, content: 'The left ear cup arrived cracked. Can I get a refund?' } });
  await prisma.message.upsert({ where: { id: 'seed-message-1002' }, update: {}, create: { id: 'seed-message-1002', ticketId: ticketA.id, senderType: SenderType.AI, content: 'I’m sorry it arrived damaged. I can help check the return options for order ORD-1001.' } });
  await prisma.message.upsert({ where: { id: 'seed-message-2001' }, update: {}, create: { id: 'seed-message-2001', ticketId: ticketC.id, senderType: SenderType.CUSTOMER, content: 'Could you tell me when my desk lamp will arrive?' } });
  await prisma.ticketNote.upsert({ where: { id: 'seed-note-1001' }, update: {}, create: { id: 'seed-note-1001', ticketId: ticketA.id, authorId: agent.id, content: 'Customer reports transit damage; request a photo if needed.' } });

  const refund = await prisma.refund.upsert({
    where: { idempotencyKey: 'seed-refund-key-1001' }, update: {},
    create: { id: 'seed-refund-1001', orderId: orderA.id, ticketId: ticketA.id, requestedById: customerA.id, amount: '6200.00', reason: 'Damaged on arrival', status: RefundStatus.PENDING_REVIEW, idempotencyKey: 'seed-refund-key-1001' },
  });
  await prisma.escalation.upsert({
    where: { ticketId: ticketA.id }, update: {},
    create: { id: 'seed-escalation-1001', ticketId: ticketA.id, refundId: refund.id, summary: 'Review refund request above the automatic approval threshold.', priority: 'HIGH', assignedToId: agent.id, decision: EscalationDecision.PENDING },
  });
  await prisma.auditEvent.upsert({
    where: { id: 'seed-audit-1001' }, update: {},
    create: { id: 'seed-audit-1001', actorId: customerA.id, action: 'REFUND_REQUESTED', entityType: 'Refund', entityId: refund.id, metadata: { source: 'seed' } },
  });

  console.info(`Seeded demo users: ${customerA.email}, ${customerB.email}, ${agent.email}`);
  console.info(`Seeded tickets: ${ticketA.id}, ${ticketB.id}, ${ticketC.id}; order ${orderB.orderNumber} demonstrates an expired return window.`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
