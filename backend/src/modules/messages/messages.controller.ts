import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { messageService } from './messages.service';
import { supportAgentService } from '../agent/supportAgent.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

const messageContentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messages = await messageService.getMessages(
      req.params.ticketId,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, { messages });
  } catch (err) { next(err); }
}

export async function postMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = messageContentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }

    // 1. Save the customer message
    const customerMessage = await messageService.saveMessage({
      ticketId: req.params.ticketId,
      senderType: 'CUSTOMER',
      content: parsed.data.content,
      requestingUserId: req.user!.userId,
    });

    // 2. Trigger the AI agent orchestration pipeline
    const aiReply = await supportAgentService.processMessage(
      req.params.ticketId,
      req.user!.userId,
      parsed.data.content,
    );

    const agentMessage = await messageService.saveMessage({
      ticketId: req.params.ticketId,
      senderType: 'AI',
      content: aiReply,
      requestingUserId: req.user!.userId,
    });

    sendSuccess(res, { customerMessage, agentMessage }, 201);
  } catch (err) { next(err); }
}
