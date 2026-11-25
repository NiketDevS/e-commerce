import Decimal from 'decimal.js';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { auditService } from '../audit/audit.service';
import { mockPaymentService } from './mockPayment.service';
import type { CreateRefundInput } from './refunds.schema';

export class RefundService {
  /**
   * The single authoritative refund processing function.
   * Called by: POST /api/refunds, and the AI agent's process_refund tool.
   * Both paths go through the SAME validation — there is no weaker shortcut.
   *
   * Business rules enforced here (not in the LLM or agent):
   *   R1 — Order ownership
   *   R2 — Return window
   *   R3 — Refund amount validation
   *   R4 — Human review threshold
   *   R5 — Expired return window handling
   *   R6 — Idempotency
   *   R8 — Mock payment execution
   *   R9 — Failure safety
   */
  async processRefund(requestedById: string, input: CreateRefundInput) {
    const amount = new Decimal(input.amount);

    // ── R6: Idempotency check ──────────────────────────────────────────────
    const existingRefund = await prisma.refund.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingRefund) {
      // Same key + same payload → return existing result (idempotent)
      if (
        existingRefund.orderId === input.orderId &&
        existingRefund.requestedById === requestedById &&
        new Decimal(existingRefund.amount.toString()).equals(amount)
      ) {
        return {
          refund: existingRefund,
          escalationId: null as string | null,
          isIdempotentRepeat: true,
        };
      }
      // Same key + different payload → conflict
      throw new AppError(
        'A different refund request was already submitted with this idempotency key',
        409,
        'CONFLICT',
      );
    }

    // ── R1: Ownership verification ──────────────────────────────────────────
    // customerId must match the authenticated user — derived from JWT, never from input
    const order = await prisma.order.findFirst({
      where: {
        id: input.orderId,
        customerId: requestedById, // ← ownership enforced at DB query level
      },
      include: {
        refunds: {
          where: { status: { in: ['PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'SUCCEEDED'] } },
          select: { amount: true },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    // ── R2 & R5: Return window check ───────────────────────────────────────
    if (!order.deliveryDate) {
      throw new AppError(
        'This order has not been delivered yet and is not eligible for a refund',
        422,
        'NOT_DELIVERED',
      );
    }

    const returnWindowDays = env.RETURN_WINDOW_DAYS;
    const deliveryDate = new Date(order.deliveryDate);
    const windowExpiry = new Date(deliveryDate);
    windowExpiry.setDate(windowExpiry.getDate() + returnWindowDays);
    const now = new Date();

    if (now > windowExpiry) {
      throw new AppError(
        `The ${returnWindowDays}-day return window for this order has expired. The delivery date was ${deliveryDate.toLocaleDateString()}.`,
        422,
        'RETURN_WINDOW_EXPIRED',
      );
    }

    // ── R3: Refund amount validation ───────────────────────────────────────
    if (amount.lte(0)) {
      throw new AppError('Refund amount must be greater than zero', 422, 'INVALID_AMOUNT');
    }

    const totalAmount = new Decimal(order.totalAmount.toString());
    const alreadyRefunded = order.refunds.reduce(
      (sum, r) => sum.plus(r.amount.toString()),
      new Decimal(0),
    );
    const remaining = totalAmount.minus(alreadyRefunded);

    if (amount.gt(remaining)) {
      throw new AppError(
        `The maximum refundable amount for this order is ₹${remaining.toFixed(2)}. You have requested ₹${amount.toFixed(2)}.`,
        422,
        'REFUND_AMOUNT_EXCEEDED',
      );
    }

    // Also verify ticket belongs to the same customer
    const ticket = await prisma.ticket.findFirst({
      where: { id: input.ticketId, customerId: requestedById },
      select: { id: true },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'NOT_FOUND');
    }

    // ── R4: Human review threshold ─────────────────────────────────────────
    const autoApproveLimit = new Decimal(env.REFUND_AUTO_APPROVE_LIMIT);
    const requiresHumanReview = amount.gt(autoApproveLimit);

    if (requiresHumanReview) {
      return this._createEscalatedRefund(requestedById, input, amount);
    } else {
      return this._processAutoRefund(requestedById, input, amount);
    }
  }

  /**
   * Auto-process path: amount ≤ REFUND_AUTO_APPROVE_LIMIT
   * Creates refund, executes mock payment, updates status — all in a transaction.
   */
  private async _processAutoRefund(
    requestedById: string,
    input: CreateRefundInput,
    amount: Decimal,
  ) {
    // ── R9: Use a transaction so DB and payment state stay consistent ──────
    const refund = await prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId: input.orderId,
          ticketId: input.ticketId,
          requestedById,
          amount: amount.toFixed(2),
          reason: input.reason,
          status: 'PROCESSING',
          idempotencyKey: input.idempotencyKey,
        },
      });

      // Execute mock payment INSIDE the transaction
      // If payment throws, the transaction rolls back — no false success
      const paymentResult = await mockPaymentService.executeRefund({
        refundId: created.id,
        orderId: input.orderId,
        amount: amount.toFixed(2),
        reason: input.reason,
      });

      if (!paymentResult.success) {
        // Setting status to FAILED and re-throwing causes transaction rollback
        // But we need the refund record for the error — handle as FAILED status
        await tx.refund.update({
          where: { id: created.id },
          data: { status: 'FAILED' },
        });
        throw new AppError(
          `Refund processing failed: ${paymentResult.failureReason ?? 'Unknown error'}`,
          500,
          'PAYMENT_FAILED',
        );
      }

      return tx.refund.update({
        where: { id: created.id },
        data: {
          status: 'SUCCEEDED',
        },
      });
    });

    await auditService.log({
      actorId: requestedById,
      action: 'REFUND_AUTO_PROCESSED',
      entityType: 'Refund',
      entityId: refund.id,
      metadata: { amount: amount.toFixed(2), orderId: input.orderId },
    });

    return { refund, escalationId: null, isIdempotentRepeat: false };
  }

  /**
   * Escalation path: amount > REFUND_AUTO_APPROVE_LIMIT
   * Creates refund in PENDING_REVIEW status and creates an Escalation.
   * Does NOT execute payment — waits for human approval.
   */
  private async _createEscalatedRefund(
    requestedById: string,
    input: CreateRefundInput,
    amount: Decimal,
  ) {
    const { refund, escalation } = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId: input.orderId,
          ticketId: input.ticketId,
          requestedById,
          amount: amount.toFixed(2),
          reason: input.reason,
          status: 'PENDING_REVIEW',
          idempotencyKey: input.idempotencyKey,
        },
      });

      const escalation = await tx.escalation.create({
        data: {
          ticketId: input.ticketId,
          refundId: refund.id,
          summary: `Customer requested a refund of ₹${amount.toFixed(2)} for order. Requires staff review (above ₹${env.REFUND_AUTO_APPROVE_LIMIT} threshold).`,
          priority: amount.gt(10000) ? 'HIGH' : 'MEDIUM',
          status: 'OPEN',
          decision: 'PENDING',
        },
      });

      // Update ticket status to ESCALATED
      await tx.ticket.update({
        where: { id: input.ticketId },
        data: { status: 'ESCALATED' },
      });

      return { refund, escalation };
    });

    await auditService.log({
      actorId: requestedById,
      action: 'REFUND_ESCALATED',
      entityType: 'Refund',
      entityId: refund.id,
      metadata: { amount: amount.toFixed(2), escalationId: escalation.id },
    });

    return { refund, escalationId: escalation.id, isIdempotentRepeat: false };
  }

  async getCustomerRefunds(customerId: string) {
    return prisma.refund.findMany({
      where: {
        order: { customerId }, // ownership via order relation
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderNumber: true, productName: true } },
      },
    });
  }

  async getCustomerRefund(refundId: string, customerId: string) {
    const refund = await prisma.refund.findFirst({
      where: {
        id: refundId,
        order: { customerId }, // ownership via order relation
      },
      include: {
        order: { select: { orderNumber: true, productName: true } },
        escalation: { select: { status: true, decision: true, priority: true } },
      },
    });

    if (!refund) throw new AppError('Refund not found', 404, 'NOT_FOUND');
    return refund;
  }
}

export const refundService = new RefundService();
