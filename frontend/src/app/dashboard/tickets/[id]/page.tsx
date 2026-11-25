'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/services/api';
import type { Message, Ticket } from '@/types';

export default function TicketConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Chat input
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Direct refund request form
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);

  const loadTicketAndMessages = useCallback(async () => {
    if (!id) return;
    try {
      const [tData, mData] = await Promise.all([
        api.tickets.get(id),
        api.tickets.getMessages(id),
      ]);
      setTicket(tData);
      setMessages(mData.messages);
      if (tData.order?.totalAmount && !refundAmount) {
        setRefundAmount(String(tData.order.totalAmount));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id, refundAmount]);

  useEffect(() => {
    loadTicketAndMessages();
  }, [loadTicketAndMessages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !id) return;
    setError('');
    setSending(true);
    try {
      const res = await api.tickets.postMessage(id, input.trim());
      setMessages((prev) => [...prev, res.customerMessage, res.agentMessage]);
      setInput('');
      // Refresh ticket status/refunds in case agent triggered a refund or escalation
      const updated = await api.tickets.get(id);
      setTicket(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handleRequestRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket?.order?.id) return;
    setError('');
    setFeedback('');
    setRequestingRefund(true);
    try {
      const result = await api.refunds.create({
        orderId: ticket.order.id,
        ticketId: ticket.id,
        amount: refundAmount,
        reason: refundReason,
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback(
        result.escalationId
          ? `Refund of ₹${result.amount} escalated for human review (Status: ${result.status}).`
          : `Refund of ₹${result.amount} processed (Status: ${result.status}).`,
      );
      setRefundReason('');
      await loadTicketAndMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refund request failed');
    } finally {
      setRequestingRefund(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;
    try {
      await api.tickets.close(id);
      await loadTicketAndMessages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not close ticket');
    }
  };

  const isClosed = ticket ? ['RESOLVED', 'CLOSED'].includes(ticket.status) : false;

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <Link href="/dashboard/tickets" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
            ← Back to Tickets
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {ticket ? ticket.subject : 'Support Conversation'}
          </h1>
          {ticket && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <StatusBadge value={ticket.status} />
              <StatusBadge value={ticket.priority} />
              {ticket.order?.orderNumber && (
                <span className="badge badge-gray">Order {ticket.order.orderNumber}</span>
              )}
            </div>
          )}
        </div>
        {ticket && !isClosed && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseTicket}>
            Close Ticket
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {feedback && <div className="alert alert-success">{feedback}</div>}

      {loading ? (
        <div className="card">Loading conversation...</div>
      ) : ticket ? (
        <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
          {/* Chat Panel */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>
              AI Support Conversation
            </h2>

            <div className="chat-box" style={{ marginBottom: 14 }}>
              <div className="chat-msg chat-msg-customer">
                <div className="chat-meta">Ticket Description</div>
                {ticket.description}
              </div>

              {messages.map((m) => {
                const cls =
                  m.senderType === 'CUSTOMER'
                    ? 'chat-msg-customer'
                    : m.senderType === 'SUPPORT_AGENT'
                      ? 'chat-msg-staff'
                      : 'chat-msg-ai';
                const label =
                  m.senderType === 'CUSTOMER'
                    ? 'You'
                    : m.senderType === 'SUPPORT_AGENT'
                      ? 'Human Support Agent'
                      : 'AI Support Agent';
                return (
                  <div key={m.id} className={`chat-msg ${cls}`}>
                    <div className="chat-meta">
                      {label} · {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                    {m.content}
                  </div>
                );
              })}
            </div>

            {isClosed ? (
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                This ticket is {ticket.status.toLowerCase()}. Open a new ticket if you need further help.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Ask about return policy, order status, or say "I want a refund for ORD-1001"...'
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            )}
          </div>

          {/* Context & Refund Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ticket.escalation && (
              <div className="card" style={{ borderColor: '#ddd6fe', background: '#faf5ff' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>
                  Escalation Status
                </h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <StatusBadge value={ticket.escalation.status} />
                  <StatusBadge value={ticket.escalation.decision} />
                </div>
              </div>
            )}

            {ticket.refunds && ticket.refunds.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10 }}>
                  Refunds on this Ticket
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ticket.refunds.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.88rem',
                      }}
                    >
                      <span>₹{r.amount}</span>
                      <StatusBadge value={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.order && !isClosed && (
              <div className="card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>
                  Request Refund ({ticket.order.orderNumber})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Refunds ≤ ₹5,000 auto-process within 7 days of delivery. Above ₹5,000 require staff approval.
                </p>
                <form onSubmit={handleRequestRefund}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="1500.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      className="form-control"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Damaged on arrival"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={requestingRefund}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    {requestingRefund ? 'Submitting...' : 'Submit Refund Request'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </RoleGuard>
  );
}
