'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN') {
      router.replace('/staff');
    } else {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading SupportAI Platform...</p>
    </div>
  );
}
