'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN') {
        router.push('/staff');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div style={{ maxWidth: 440, margin: '36px auto' }}>
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 4 }}>Sign in</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          Access your orders, AI support chat, or staff console.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 6 }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
          New customer?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Create an account
          </Link>
        </p>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            DEMO ACCOUNTS (password: <code>password123</code>)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo('maya@example.com')}>
              Maya (Customer)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo('arjun@example.com')}>
              Arjun (Customer)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo('support@example.com')}>
              Sam (Support Agent)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
