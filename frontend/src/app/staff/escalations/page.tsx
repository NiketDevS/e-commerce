'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/services/api';
import type { Escalation } from '@/types';

export default function StaffEscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.listEscalations();
      setEscalations(res.escalations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  const handleDecision = async (
    escalationId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
  ) => {
    setError('');
    setFeedback('');
    setBusyId(escalationId);
    try {
      const note = notesById[escalationId]?.trim();
      const res = await api.staff.decideEscalation(escalationId, {
        decision,
        ...(note ? { note } : {}),
      });
      setFeedback(
        `Decision "${res.decision}" recorded.${res.refundStatus ? ` Refund status: ${res.refundStatus}.` : ''}`,
      );
      await loadEscalations();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit decision');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={['SUPPORT_AGENT', 'ADMIN']}>
      <div className="page-header">
        <div>
          <Link href="/staff" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
            ← Back to Ticket Queue
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>Escalation & High-Value Refund Review</h1>
          <p className="page-subtitle">
            Approve, reject, or request more information for escalated tickets and refunds &gt; ₹5,000
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {feedback && <div className="alert alert-success">{feedback}</div>}

      {loading ? (
        <div className="card">Loading escalations...</div>
      ) : escalations.length === 0 ? (
        <div className="card">No escalations in queue.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {escalations.map((esc) => {
            const isResolved = esc.status === 'RESOLVED';
            return (
              <div key={esc.id} className="card">
                <div className="page-header" style={{ marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <StatusBadge value={esc.priority} />
                      <StatusBadge value={esc.status} />
                      <StatusBadge value={esc.decision} />
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{esc.ticket.subject}</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Customer: {esc.ticket.customer?.name} ({esc.ticket.customer?.email})
                      {esc.ticket.order?.orderNumber ? ` · Order ${esc.ticket.order.orderNumber}` : ''}
                    </p>
                  </div>
                  <Link href={`/staff/tickets/${esc.ticketId}`} className="btn btn-secondary btn-sm">
                    Inspect Full Ticket
                  </Link>
                </div>

                <p style={{ fontSize: '0.92rem', marginBottom: 12 }}>{esc.summary}</p>

                {esc.refund && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'var(--surface-muted)',
                      borderRadius: 8,
                      marginBottom: 14,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: '0.9rem',
                    }}
                  >
                    <div>
                      <strong>Refund Requested:</strong> ₹{esc.refund.amount} — {esc.refund.reason}
                    </div>
                    <StatusBadge value={esc.refund.status} />
                  </div>
                )}

                {!isResolved && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Optional decision note / message to customer..."
                        value={notesById[esc.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [esc.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={busyId === esc.id}
                        onClick={() => handleDecision(esc.id, 'APPROVE')}
                      >
                        Approve & Execute Refund
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === esc.id}
                        onClick={() => handleDecision(esc.id, 'REJECT')}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === esc.id}
                        onClick={() => handleDecision(esc.id, 'REQUEST_INFO')}
                      >
                        Request More Info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </RoleGuard>
  );
}
