import { Request, Response, NextFunction } from 'express';
import { escalationService } from './escalations.service';
import { listEscalationsQuerySchema, escalationDecisionSchema } from './escalations.schema';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getEscalations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listEscalationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const result = await escalationService.listEscalations(parsed.data);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getEscalation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const escalation = await escalationService.getEscalation(req.params.id);
    sendSuccess(res, escalation);
  } catch (err) {
    next(err);
  }
}

export async function decideEscalation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = escalationDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }
    const result = await escalationService.decideEscalation(
      req.params.id,
      req.user!.userId,
      parsed.data,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
