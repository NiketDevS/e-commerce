'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/services/api';
import type { Order } from '@/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.orders
      .get(id)
      .then(setOrder)
      .catch((err) => setError(err?.message || 'Unable to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <Link href="/dashboard/orders" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
            ← Back to Orders
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {order ? `Order ${order.orderNumber}` : 'Order Details'}
          </h1>
        </div>
        {order && (
          <Link href={`/dashboard/tickets?orderId=${order.id}`} className="btn btn-primary">
            Get Support / Request Refund
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">Loading order...</div>
      ) : order ? (
        <div className="grid-2">
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 14 }}>Order Summary</h2>
            <div style={{ display: 'grid', gap: 10, fontSize: '0.92rem' }}>
              <div><strong>Product:</strong> {order.productName}</div>
              <div><strong>Category:</strong> {order.category}</div>
              <div><strong>Status:</strong> <StatusBadge value={order.status} /></div>
              <div><strong>Total Paid:</strong> ₹{order.totalAmount}</div>
              <div>
                <strong>Delivery Date:</strong>{' '}
                {order.deliveryDate ? new Date(order.deliveryDate).toLocaleString() : 'Not delivered yet'}
              </div>
              <div><strong>Ordered On:</strong> {new Date(order.createdAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 14 }}>Refund History</h2>
            {!order.refunds || order.refunds.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No refund requests for this order.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.refunds.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 10,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>₹{r.amount}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
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
