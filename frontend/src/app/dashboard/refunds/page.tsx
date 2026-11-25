'use client';

import { useEffect, useState } from 'react';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/services/api';
import type { RefundSummary } from '@/types';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.refunds
      .list()
      .then((res) => setRefunds(res.refunds))
      .catch((err) => setError(err?.message || 'Failed to load refunds'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Status</h1>
          <p className="page-subtitle">Track your refund requests and human review decisions</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading refunds...</p>
        ) : refunds.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You have no refund requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested On</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.order?.orderNumber ?? '—'}</td>
                    <td>{r.order?.productName ?? '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{r.amount}</td>
                    <td>{r.reason || '—'}</td>
                    <td><StatusBadge value={r.status} /></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
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
