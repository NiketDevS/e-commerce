import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
    },
  },
});

export async function resetDb(): Promise<void> {
  await testPrisma.auditEvent.deleteMany();
  await testPrisma.escalation.deleteMany();
  await testPrisma.refund.deleteMany();
  await testPrisma.ticketNote.deleteMany();
  await testPrisma.message.deleteMany();
  await testPrisma.ticket.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function seedTestData() {
  const passwordHash = await hash('password123', 10);

  const alice = await testPrisma.user.create({
    data: {
      name: 'Alice Customer',
      email: 'alice@test.com',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const bob = await testPrisma.user.create({
    data: {
      name: 'Bob Customer',
      email: 'bob@test.com',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const staff = await testPrisma.user.create({
    data: {
      name: 'Sam Staff',
      email: 'staff@test.com',
      passwordHash,
      role: Role.SUPPORT_AGENT,
    },
  });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const orderEligible = await testPrisma.order.create({
    data: {
      customerId: alice.id,
      orderNumber: 'ORD-TEST-001',
      status: OrderStatus.DELIVERED,
      productName: 'Wireless Mouse',
      category: 'Electronics',
      deliveryDate: twoDaysAgo,
      totalAmount: '3000.00',
    },
  });

  const orderExpired = await testPrisma.order.create({
    data: {
      customerId: alice.id,
      orderNumber: 'ORD-TEST-002',
      status: OrderStatus.DELIVERED,
      productName: 'Cotton Jacket',
      category: 'Clothing',
      deliveryDate: tenDaysAgo,
      totalAmount: '1500.00',
    },
  });

  const orderHighValue = await testPrisma.order.create({
    data: {
      customerId: alice.id,
      orderNumber: 'ORD-TEST-003',
      status: OrderStatus.DELIVERED,
      productName: 'Espresso Machine',
      category: 'Home',
      deliveryDate: oneDayAgo,
      totalAmount: '8000.00',
    },
  });

  const orderBob = await testPrisma.order.create({
    data: {
      customerId: bob.id,
      orderNumber: 'ORD-TEST-004',
      status: OrderStatus.DELIVERED,
      productName: 'USB-C Hub',
      category: 'Electronics',
      deliveryDate: oneDayAgo,
      totalAmount: '2000.00',
    },
  });

  return {
    alice,
    bob,
    staff,
    orderEligible,
    orderExpired,
    orderHighValue,
    orderBob,
  };
}
