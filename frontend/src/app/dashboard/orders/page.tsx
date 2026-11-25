'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/services/api';
import type { Order } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.orders
      .list(1, 50)
      .then((res) => setOrders(res.orders))
      .catch((err) => setError(err?.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">View your order status, delivery dates, and refund eligibility</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You have no orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Delivered</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                    <td>{order.productName}</td>
                    <td>{order.category}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td>
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString()
                        : 'Pending'}
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{order.totalAmount}</td>
                    <td>
                      <Link href={`/dashboard/orders/${order.id}`} className="btn btn-secondary btn-sm">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
