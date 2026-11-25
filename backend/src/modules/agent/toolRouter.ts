import crypto from 'node:crypto';
import { prisma } from '../../config/prisma';
import { policyService } from '../policies/policies.service';
import { refundService } from '../refunds/refunds.service';
import { auditService } from '../audit/audit.service';
import type { ToolResult } from './agent.types';

/**
 * ToolRouter — executes allowlisted backend tools on behalf of the AI agent.
 *
 * Security invariants:
 * 1. Always uses authenticatedUserId from verified JWT — never from message text.
 * 2. get_order_details enforces customerId === authenticatedUserId at DB level.
 * 3. process_refund delegates 100% of business rules to RefundService.
 * 4. escalate_to_human creates an Escalation record without exposing internal notes.
 */
export class ToolRouter {
  async getOrderDetails(orderNumberOrId: string, authenticatedUserId: string): Promise<ToolResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          customerId: authenticatedUserId, // ← ownership enforced at DB
          OR: [{ orderNumber: orderNumberOrId }, { id: orderNumberOrId }],
        },
        include: {
          refunds: {
            select: { id: true, amount: true, status: true },
          },
        },
      });

      if (!order) {
        return {
          tool: 'get_order_details',
          success: false,
          error: `No order matching "${orderNumberOrId}" was found in your account.`,
          errorCode: 'NOT_FOUND',
        };
      }

      return {
        tool: 'get_order_details',
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          productName: order.productName,
          category: order.category,
          deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
          totalAmount: order.totalAmount.toString(),
          refunds: order.refunds.map((r) => ({
            id: r.id,
            amount: r.amount.toString(),
            status: r.status,
          })),
        },
      };
    } catch {
      return {
        tool: 'get_order_details',
        success: false,
        error: 'Unable to retrieve order details right now.',
        errorCode: 'TOOL_ERROR',
      };
    }
  }

  async searchReturnPolicy(query: string): Promise<ToolResult> {
    const sections = policyService.searchPolicy(query);
    return {
      tool: 'search_return_policy',
      success: true,
      data: {
        sections: sections.map((s) => ({ title: s.title, content: s.content })),
      },
    };
  }

  async processRefund(params: {
    authenticatedUserId: string;
    orderId: string;
    ticketId: string;
    amount: string;
    reason: string;
  }): Promise<ToolResult> {
    try {
      // Deterministic idempotency key per ticket+order+amount+reason in agent turn, or UUID
      const idempotencyKey = crypto.randomUUID();

      const result = await refundService.processRefund(params.authenticatedUserId, {
        orderId: params.orderId,
        ticketId: params.ticketId,
        amount: params.amount,
        reason: params.reason,
        idempotencyKey,
      });

      return {
        tool: 'process_refund',
        success: true,
        data: {
          refundId: result.refund.id,
          status: result.refund.status,
          amount: result.refund.amount.toString(),
          escalationId: result.escalationId ?? null,
        },
      };
    } catch (err: any) {
      return {
        tool: 'process_refund',
        success: false,
        error: err?.message ?? 'Refund could not be processed.',
        errorCode: err?.code ?? 'REFUND_ERROR',
      };
    }
  }

  async escalateToHuman(params: {
    ticketId: string;
    summary: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    actorId: string;
  }): Promise<ToolResult> {
    try {
      const existing = await prisma.escalation.findUnique({
        where: { ticketId: params.ticketId },
      });

      if (existing) {
        return {
          tool: 'escalate_to_human',
          success: true,
          data: { escalationId: existing.id, status: existing.status, alreadyEscalated: true },
        };
      }

      const escalation = await prisma.$transaction(async (tx) => {
        const created = await tx.escalation.create({
          data: {
            ticketId: params.ticketId,
            summary: params.summary,
            priority: params.priority,
            status: 'OPEN',
            decision: 'PENDING',
          },
        });

        await tx.ticket.update({
          where: { id: params.ticketId },
          data: { status: 'ESCALATED' },
        });

        return created;
      });

      await auditService.log({
        actorId: params.actorId,
        action: 'ESCALATION_CREATED',
        entityType: 'Escalation',
        entityId: escalation.id,
        metadata: { ticketId: params.ticketId, priority: params.priority },
      });

      return {
        tool: 'escalate_to_human',
        success: true,
        data: { escalationId: escalation.id, status: escalation.status },
      };
    } catch {
      return {
        tool: 'escalate_to_human',
        success: false,
        error: 'Unable to escalate ticket right now.',
        errorCode: 'ESCALATION_ERROR',
      };
    }
  }
}

export const toolRouter = new ToolRouter();
