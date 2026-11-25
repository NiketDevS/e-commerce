import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { orderService } from './orders.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 400, 'Invalid pagination parameters', 'VALIDATION_ERROR');
      return;
    }

    const result = await orderService.getCustomerOrders(
      req.user!.userId,
      parsed.data.page,
      parsed.data.limit,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await orderService.getCustomerOrder(req.params.id, req.user!.userId);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}
