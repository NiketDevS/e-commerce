'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/services/api';
import type { Order, RefundSummary, Ticket } from '@/types';

export default function CustomerDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refunds, setRefunds] = useState<RefundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.orders.list(1, 5), api.tickets.list({ limit: 10 }), api.refunds.list()])
      .then(([o, t, r]) => {
        setOrders(o.orders);
        setTickets(t.tickets);
        setRefunds(r.refunds);
      })
      .catch((err) => setError(err?.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const openTickets = tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status));
  const resolvedTickets = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status));
  const pendingRefunds = refunds.filter((r) =>
    ['PENDING_REVIEW', 'PROCESSING', 'APPROVED'].includes(r.status),
  );

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Dashboard</h1>
          <p className="page-subtitle">Overview of your orders, support tickets, and refunds</p>
        </div>
        <Link href="/dashboard/tickets" className="btn btn-primary">
          + New Support Ticket
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">Loading your dashboard...</div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 22 }}>
            <div className="card">
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Recent Orders</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4 }}>{orders.length}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Open Tickets</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>
                {openTickets.length}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Resolved Tickets</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4, color: 'var(--success)' }}>
                {resolvedTickets.length}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Pending Refunds</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4, color: 'var(--warning)' }}>
                {pendingRefunds.length}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="page-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Orders</h2>
                <Link href="/dashboard/orders" className="btn btn-secondary btn-sm">
                  View all
                </Link>
              </div>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No orders yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/dashboard/orders/${o.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{o.orderNumber} · {o.productName}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          ₹{o.totalAmount} · {o.category}
                        </div>
                      </div>
                      <StatusBadge value={o.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="page-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Support Tickets</h2>
                <Link href="/dashboard/tickets" className="btn btn-secondary btn-sm">
                  View all
                </Link>
              </div>
              {tickets.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No support tickets yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tickets.slice(0, 5).map((t) => (
                    <Link
                      key={t.id}
                      href={`/dashboard/tickets/${t.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{t.subject}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {t.order?.orderNumber ? `Order ${t.order.orderNumber} · ` : ''}
                          {t._count?.messages ?? 0} messages
                        </div>
                      </div>
                      <StatusBadge value={t.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </RoleGuard>
  );
}
