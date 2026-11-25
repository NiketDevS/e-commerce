import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'REFUND_REQUESTED'
  | 'REFUND_AUTO_PROCESSED'
  | 'REFUND_ESCALATED'
  | 'REFUND_APPROVED_BY_STAFF'
  | 'REFUND_REJECTED_BY_STAFF'
  | 'REFUND_PROCESSING_FAILED'
  | 'ESCALATION_CREATED'
  | 'ESCALATION_DECISION_MADE'
  | 'NOTE_ADDED';

/**
 * AuditService — append-only event log.
 * Never updates or deletes audit events.
 * actorId is nullable (system events have no actor).
 */
export class AuditService {
  async log(params: {
    actorId: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Fire-and-forget inside a try/catch — audit failure must never break the main flow
    try {
      await prisma.auditEvent.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Log to stderr but don't throw — audit failure is non-fatal
      console.error('[AUDIT] Failed to write audit event:', params.action, err);
    }
  }

  async getEventsForEntity(entityType: string, entityId: string) {
    return prisma.auditEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });
  }
}

export const auditService = new AuditService();
