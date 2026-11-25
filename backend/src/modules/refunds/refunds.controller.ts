import { Request, Response, NextFunction } from 'express';
import { createRefundSchema } from './refunds.schema';
import { refundService } from './refunds.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createRefundSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }

    const result = await refundService.processRefund(req.user!.userId, parsed.data);
    const statusCode = result.isIdempotentRepeat ? 200 : 201;

    sendSuccess(
      res,
      {
        id: result.refund.id,
        status: result.refund.status,
        amount: result.refund.amount,
        escalationId: result.escalationId ?? null,
        isIdempotentRepeat: result.isIdempotentRepeat,
      },
      statusCode,
    );
  } catch (err) {
    next(err);
  }
}

export async function getRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refunds = await refundService.getCustomerRefunds(req.user!.userId);
    sendSuccess(res, { refunds });
  } catch (err) {
    next(err);
  }
}

export async function getRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refund = await refundService.getCustomerRefund(req.params.id, req.user!.userId);
    sendSuccess(res, refund);
  } catch (err) {
    next(err);
  }
}
