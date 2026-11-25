import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export class OrderService {
  /**
   * Returns all orders belonging to the authenticated customer.
   * Never returns orders for any other customer.
   */
  async getCustomerOrders(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          productName: true,
          category: true,
          deliveryDate: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Returns a single order — only if it belongs to the authenticated customer.
   * Returns 404 (not 403) to avoid revealing that the order ID exists.
   */
  async getCustomerOrder(orderId: string, customerId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId, // ← critical: ownership enforced at DB query level
      },
      include: {
        refunds: {
          select: { id: true, amount: true, status: true, createdAt: true },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    return order;
  }
}

export const orderService = new OrderService();
