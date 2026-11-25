'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/services/api';
import type { Ticket } from '@/types';

export default function StaffTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.staff.getTicket(id);
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleUpdateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setFeedback('');
    try {
      await api.staff.updateTicket(id, { status, priority });
      setFeedback('Ticket status/priority updated.');
      await loadTicket();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update ticket');
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim()) return;
    setError('');
    setFeedback('');
    setSavingNote(true);
    try {
      await api.staff.addNote(id, noteContent.trim());
      setNoteContent('');
      setFeedback('Internal note saved (hidden from customer).');
      await loadTicket();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['SUPPORT_AGENT', 'ADMIN']}>
      <div className="page-header">
        <div>
          <Link href="/staff" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
            ← Back to Ticket Queue
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {ticket ? ticket.subject : 'Ticket Inspection'}
          </h1>
        </div>
        {ticket?.escalation && (
          <Link href="/staff/escalations" className="btn btn-primary btn-sm">
            Go to Escalations ({ticket.escalation.decision})
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {feedback && <div className="alert alert-success">{feedback}</div>}

      {loading ? (
        <div className="card">Loading ticket details...</div>
      ) : ticket ? (
        <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Conversation History */}
            <div className="card">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>
                Customer Conversation History
              </h2>
              <div className="chat-box">
                <div className="chat-msg chat-msg-customer">
                  <div className="chat-meta">Customer Description</div>
                  {ticket.description}
                </div>
                {(ticket.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className={`chat-msg ${
                      m.senderType === 'CUSTOMER'
                        ? 'chat-msg-customer'
                        : m.senderType === 'SUPPORT_AGENT'
                          ? 'chat-msg-staff'
                          : 'chat-msg-ai'
                    }`}
                  >
                    <div className="chat-meta">
                      {m.senderType} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="card" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4 }}>
                Internal Staff Notes
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: 12 }}>
                Confidential — stored in <code>TicketNote</code> and never exposed to customers.
              </p>

              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  className="form-control"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add an internal note for other staff..."
                />
                <button type="submit" disabled={savingNote || !noteContent.trim()} className="btn btn-primary btn-sm">
                  {savingNote ? 'Saving...' : 'Add Note'}
                </button>
              </form>

              {(ticket.notes || []).length === 0 ? (
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>No internal notes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ticket.notes!.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        background: '#fff',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #fde68a',
                        fontSize: '0.88rem',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                        {n.author?.name ?? 'Staff'} · {new Date(n.createdAt).toLocaleString()}
                      </div>
                      {n.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Context + Management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10 }}>
                Customer & Order Context
              </h3>
              <div style={{ display: 'grid', gap: 6, fontSize: '0.88rem' }}>
                <div><strong>Customer:</strong> {ticket.customer?.name}</div>
                <div><strong>Email:</strong> {ticket.customer?.email}</div>
                {ticket.order ? (
                  <>
                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                    <div><strong>Order #:</strong> {ticket.order.orderNumber}</div>
                    <div><strong>Product:</strong> {ticket.order.productName}</div>
                    <div><strong>Amount:</strong> ₹{ticket.order.totalAmount}</div>
                    <div>
                      <strong>Delivered:</strong>{' '}
                      {ticket.order.deliveryDate
                        ? new Date(ticket.order.deliveryDate).toLocaleDateString()
                        : 'Pending'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No order linked</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10 }}>
                Update Status & Priority
              </h3>
              <form onSubmit={handleUpdateTicket}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                  Save Changes
                </button>
              </form>
            </div>

            {ticket.refunds && ticket.refunds.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10 }}>Refunds</h3>
                {ticket.refunds.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>₹{r.amount}</span>
                    <StatusBadge value={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </RoleGuard>
  );
}
