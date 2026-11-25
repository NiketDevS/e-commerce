'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <header className="topbar">
        <Link href="/" className="topbar-brand">
          <span>🛒</span> SupportAI Platform
        </Link>
        <div className="topbar-nav">
          <Link href="/login" className={`nav-link ${pathname === '/login' ? 'active' : ''}`}>
            Login
          </Link>
          <Link href="/register" className={`nav-link ${pathname === '/register' ? 'active' : ''}`}>
            Register
          </Link>
        </div>
      </header>
    );
  }

  const isStaff = user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN';

  return (
    <header className="topbar">
      <Link href={isStaff ? '/staff' : '/dashboard'} className="topbar-brand">
        <span>🛒</span> SupportAI {isStaff ? '· Staff Console' : ''}
      </Link>

      <nav className="topbar-nav">
        {isStaff ? (
          <>
            <Link href="/staff" className={`nav-link ${pathname === '/staff' ? 'active' : ''}`}>
              Ticket Queue
            </Link>
            <Link
              href="/staff/escalations"
              className={`nav-link ${pathname.startsWith('/staff/escalations') ? 'active' : ''}`}
            >
              Escalations
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard"
              className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/orders"
              className={`nav-link ${pathname.startsWith('/dashboard/orders') ? 'active' : ''}`}
            >
              Orders
            </Link>
            <Link
              href="/dashboard/tickets"
              className={`nav-link ${pathname.startsWith('/dashboard/tickets') ? 'active' : ''}`}
            >
              Tickets & AI Chat
            </Link>
            <Link
              href="/dashboard/refunds"
              className={`nav-link ${pathname.startsWith('/dashboard/refunds') ? 'active' : ''}`}
            >
              Refunds
            </Link>
          </>
        )}
      </nav>

      <div className="topbar-user">
        <span style={{ color: 'var(--text-muted)' }}>
          {user.name} <span className="badge badge-gray">{user.role}</span>
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
