'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/services/api';
import type { Order, Ticket } from '@/types';

export default function CustomerTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Ticket Form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('return');
  const [orderId, setOrderId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const [tRes, oRes] = await Promise.all([api.tickets.list({ limit: 50 }), api.orders.list(1, 50)]);
      setTickets(tRes.tickets);
      setOrders(oRes.orders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedOrder = params.get('orderId');
    if (preselectedOrder) setOrderId(preselectedOrder);
    loadData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const created = await api.tickets.create({
        subject,
        description,
        category,
        ...(orderId ? { orderId } : {}),
      });
      router.push(`/dashboard/tickets/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create ticket');
      setCreating(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets & AI Chat</h1>
          <p className="page-subtitle">Open a ticket to chat with our AI support agent or track existing requests</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 14 }}>New Support Ticket</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="subject">Subject</label>
              <input
                id="subject"
                type="text"
                required
                minLength={5}
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Request refund for damaged headphones"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <select
                id="category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="return">Return / Refund</option>
                <option value="shipping">Shipping & Delivery</option>
                <option value="damaged">Damaged / Defective Item</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="orderId">Related Order (optional)</label>
              <select
                id="orderId"
                className="form-control"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <option value="">-- No specific order --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.productName} (₹{o.totalAmount})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                required
                minLength={10}
                rows={4}
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue..."
              />
            </div>

            <button type="submit" disabled={creating} className="btn btn-primary" style={{ width: '100%' }}>
              {creating ? 'Creating...' : 'Create Ticket & Start AI Chat'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 14 }}>Your Tickets</h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No support tickets yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {t.category} {t.order?.orderNumber ? `· ${t.order.orderNumber}` : ''} ·{' '}
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge value={t.priority} />
                    <StatusBadge value={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
