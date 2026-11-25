import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { auditService } from '../audit/audit.service';
import { mockPaymentService } from '../refunds/mockPayment.service';
import type { EscalationDecisionInput } from './escalations.schema';

export class EscalationService {
  async listEscalations(filters: {
    status?: string;
    priority?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.EscalationWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.priority) where.priority = filters.priority as any;

    const skip = (filters.page - 1) * filters.limit;

    const [escalations, total] = await prisma.$transaction([
      prisma.escalation.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: filters.limit,
        include: {
          ticket: {
            select: {
              id: true,
              subject: true,
              status: true,
              priority: true,
              customer: { select: { id: true, name: true, email: true } },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  productName: true,
                  totalAmount: true,
                  deliveryDate: true,
                },
              },
            },
          },
          refund: {
            select: { id: true, amount: true, reason: true, status: true, createdAt: true },
          },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.escalation.count({ where }),
    ]);

    return { escalations, total, page: filters.page, limit: filters.limit };
  }

  async getEscalation(escalationId: string) {
    const escalation = await prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        ticket: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            order: {
              include: {
                refunds: { select: { id: true, amount: true, status: true, createdAt: true } },
              },
            },
            messages: { orderBy: { createdAt: 'asc' } },
            notes: {
              orderBy: { createdAt: 'desc' },
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
        refund: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!escalation) {
      throw new AppError('Escalation not found', 404, 'NOT_FOUND');
    }

    return escalation;
  }

  /**
   * Staff decision on an escalation: APPROVE | REJECT | REQUEST_INFO
   * - APPROVE: re-validates refund eligibility, executes MockPaymentService, updates Refund -> SUCCEEDED
   * - REJECT: marks Refund -> REJECTED (if linked), Escalation -> RESOLVED
   * - REQUEST_INFO: marks Ticket -> WAITING_FOR_CUSTOMER, posts system/staff prompt if note provided
   */
  async decideEscalation(
    escalationId: string,
    staffUserId: string,
    input: EscalationDecisionInput,
  ) {
    const escalation = await prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        refund: {
          include: {
            order: {
              include: {
                refunds: {
                  where: { status: { in: ['APPROVED', 'PROCESSING', 'SUCCEEDED'] } },
                  select: { id: true, amount: true },
                },
              },
            },
          },
        },
        ticket: true,
      },
    });

    if (!escalation) {
      throw new AppError('Escalation not found', 404, 'NOT_FOUND');
    }

    if (escalation.status === 'RESOLVED') {
      throw new AppError('This escalation has already been resolved', 400, 'ALREADY_DECIDED');
    }

    if (input.decision === 'REQUEST_INFO') {
      const result = await prisma.$transaction(async (tx) => {
        const updatedEscalation = await tx.escalation.update({
          where: { id: escalationId },
          data: {
            status: 'UNDER_REVIEW',
            decision: 'REQUEST_INFO',
            assignedToId: staffUserId,
          },
        });

        await tx.ticket.update({
          where: { id: escalation.ticketId },
          data: { status: 'WAITING_FOR_CUSTOMER' },
        });

        if (input.note) {
          await tx.ticketNote.create({
            data: {
              ticketId: escalation.ticketId,
              authorId: staffUserId,
              content: `[REQUEST_INFO] ${input.note}`,
            },
          });
          await tx.message.create({
            data: {
              ticketId: escalation.ticketId,
              senderType: 'SUPPORT_AGENT',
              content: input.note,
            },
          });
        }

        return updatedEscalation;
      });

      await auditService.log({
        actorId: staffUserId,
        action: 'ESCALATION_DECISION_MADE',
        entityType: 'Escalation',
        entityId: escalationId,
        metadata: { decision: 'REQUEST_INFO' },
      });

      return {
        escalationId: result.id,
        decision: result.decision,
        refundStatus: escalation.refund?.status ?? null,
      };
    }

    if (input.decision === 'REJECT') {
      const result = await prisma.$transaction(async (tx) => {
        const updatedEscalation = await tx.escalation.update({
          where: { id: escalationId },
          data: {
            status: 'RESOLVED',
            decision: 'REJECTED',
            assignedToId: staffUserId,
          },
        });

        let refundStatus: string | null = null;
        if (escalation.refundId) {
          const updatedRefund = await tx.refund.update({
            where: { id: escalation.refundId },
            data: {
              status: 'REJECTED',
              reviewedById: staffUserId,
            },
          });
          refundStatus = updatedRefund.status;
        }

        await tx.ticket.update({
          where: { id: escalation.ticketId },
          data: { status: 'RESOLVED' },
        });

        if (input.note) {
          await tx.ticketNote.create({
            data: {
              ticketId: escalation.ticketId,
              authorId: staffUserId,
              content: `[REJECTED] ${input.note}`,
            },
          });
        }

        await tx.message.create({
          data: {
            ticketId: escalation.ticketId,
            senderType: 'SUPPORT_AGENT',
            content: input.note
              ? `Your escalated request has been reviewed and could not be approved: ${input.note}`
              : 'Your escalated request has been reviewed and was not approved.',
          },
        });

        return { updatedEscalation, refundStatus };
      });

      await auditService.log({
        actorId: staffUserId,
        action: 'REFUND_REJECTED_BY_STAFF',
        entityType: 'Escalation',
        entityId: escalationId,
        metadata: { refundId: escalation.refundId, decision: 'REJECTED' },
      });

      return {
        escalationId: result.updatedEscalation.id,
        decision: result.updatedEscalation.decision,
        refundStatus: result.refundStatus,
      };
    }

    // ── APPROVE path ──────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      let refundStatus: string | null = null;

      if (escalation.refund) {
        const refund = escalation.refund;
        const order = refund.order;

        // Final eligibility re-check (balance still valid?)
        const totalAmount = new Decimal(order.totalAmount.toString());
        const alreadyProcessed = order.refunds
          .filter((r) => r.id !== refund.id)
          .reduce((sum, r) => sum.plus(r.amount.toString()), new Decimal(0));
        const remaining = totalAmount.minus(alreadyProcessed);
        const requested = new Decimal(refund.amount.toString());

        if (requested.gt(remaining)) {
          throw new AppError(
            `Cannot approve: remaining refundable balance is ₹${remaining.toFixed(2)}`,
            422,
            'REFUND_AMOUNT_EXCEEDED',
          );
        }

        // Transition PENDING_REVIEW -> APPROVED -> PROCESSING
        await tx.refund.update({
          where: { id: refund.id },
          data: { status: 'PROCESSING', reviewedById: staffUserId },
        });

        const paymentResult = await mockPaymentService.executeRefund({
          refundId: refund.id,
          orderId: refund.orderId,
          amount: requested.toFixed(2),
          reason: refund.reason,
        });

        if (!paymentResult.success) {
          throw new AppError(
            `Simulated refund execution failed: ${paymentResult.failureReason ?? 'Unknown error'}`,
            500,
            'PAYMENT_FAILED',
          );
        }

        const succeededRefund = await tx.refund.update({
          where: { id: refund.id },
          data: { status: 'SUCCEEDED' },
        });
        refundStatus = succeededRefund.status;
      }

      const updatedEscalation = await tx.escalation.update({
        where: { id: escalationId },
        data: {
          status: 'RESOLVED',
          decision: 'APPROVED',
          assignedToId: staffUserId,
        },
      });

      await tx.ticket.update({
        where: { id: escalation.ticketId },
        data: { status: 'RESOLVED' },
      });

      if (input.note) {
        await tx.ticketNote.create({
          data: {
            ticketId: escalation.ticketId,
            authorId: staffUserId,
            content: `[APPROVED] ${input.note}`,
          },
        });
      }

      await tx.message.create({
        data: {
          ticketId: escalation.ticketId,
          senderType: 'SUPPORT_AGENT',
          content: escalation.refund
            ? `Good news! Your refund of ₹${new Decimal(escalation.refund.amount.toString()).toFixed(2)} has been approved and processed.`
            : 'Your escalated support ticket has been approved and resolved by our team.',
        },
      });

      return { updatedEscalation, refundStatus };
    });

    await auditService.log({
      actorId: staffUserId,
      action: 'REFUND_APPROVED_BY_STAFF',
      entityType: 'Escalation',
      entityId: escalationId,
      metadata: {
        refundId: escalation.refundId,
        decision: 'APPROVED',
        returnWindowDays: env.RETURN_WINDOW_DAYS,
      },
    });

    return {
      escalationId: result.updatedEscalation.id,
      decision: result.updatedEscalation.decision,
      refundStatus: result.refundStatus,
    };
  }
}

export const escalationService = new EscalationService();
