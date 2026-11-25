import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'SupportAI — E-Commerce Customer Support Platform',
  description: 'AI-powered customer support, order tracking, refunds, and human escalations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <Navbar />
            <main className="main-container">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
