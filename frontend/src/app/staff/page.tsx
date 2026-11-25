'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/RoleGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/services/api';
import type { Ticket } from '@/types';

export default function StaffDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.staff.listTickets({
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        limit: 50,
      });
      setTickets(res.tickets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ticket queue');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <RoleGuard allowedRoles={['SUPPORT_AGENT', 'ADMIN']}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Support Dashboard</h1>
          <p className="page-subtitle">Filter, search, and resolve customer support tickets</p>
        </div>
        <Link href="/staff/escalations" className="btn btn-primary">
          Review Escalations
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: '1 1 240px' }}
            placeholder="Search by subject, description, customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: 190 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select
            className="form-control"
            style={{ width: 160 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading ticket queue...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No tickets match the current filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.subject}</td>
                    <td>
                      <div>{t.customer?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {t.customer?.email}
                      </div>
                    </td>
                    <td>{t.order?.orderNumber ?? '—'}</td>
                    <td><StatusBadge value={t.priority} /></td>
                    <td><StatusBadge value={t.status} /></td>
                    <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/staff/tickets/${t.id}`} className="btn btn-secondary btn-sm">
                        Inspect
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
