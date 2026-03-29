import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenantSales — Painel',
  description: 'Painel do parceiro TenantSales',
};

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('token')?.value;
  let profileCompleted = true;

  if (token) {
    try {
      const res = await fetch(`${API_URL}/dashboard/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        profileCompleted = data.profileCompleted === true;
      }
    } catch {}
  }

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AppShell hasToken={!!token} profileCompleted={profileCompleted}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
