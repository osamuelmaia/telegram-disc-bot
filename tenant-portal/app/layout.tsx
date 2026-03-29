import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenantSales — Painel',
  description: 'Painel do parceiro TenantSales',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const hasToken = !!cookies().get('token')?.value;

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AppShell hasToken={hasToken}>{children}</AppShell>
      </body>
    </html>
  );
}
