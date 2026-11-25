'use client';

const COLOR_MAP: Record<string, string> = {
  OPEN: 'badge-blue',
  IN_PROGRESS: 'badge-yellow',
  WAITING_FOR_CUSTOMER: 'badge-yellow',
  ESCALATED: 'badge-purple',
  RESOLVED: 'badge-green',
  CLOSED: 'badge-gray',
  PENDING_REVIEW: 'badge-yellow',
  UNDER_REVIEW: 'badge-yellow',
  APPROVED: 'badge-green',
  SUCCEEDED: 'badge-green',
  PROCESSING: 'badge-blue',
  REJECTED: 'badge-red',
  FAILED: 'badge-red',
  DELIVERED: 'badge-green',
  SHIPPED: 'badge-blue',
  PENDING: 'badge-yellow',
  CANCELLED: 'badge-red',
  LOW: 'badge-gray',
  MEDIUM: 'badge-blue',
  HIGH: 'badge-yellow',
  URGENT: 'badge-red',
};

export function StatusBadge({ value }: { value: string }) {
  const cls = COLOR_MAP[value] || 'badge-gray';
  return <span className={`badge ${cls}`}>{value.replace(/_/g, ' ')}</span>;
}
