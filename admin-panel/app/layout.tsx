import type { Metadata } from 'next';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  RefreshCw,
  Users,
  Package,
  KeyRound,
  Zap,
  Landmark,
  Settings,
  CreditCard,
} from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin — Telegram Sales Bot',
  description: 'Painel administrativo',
};

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenants', label: 'Parceiros', icon: Building2 },
  { href: '/orders', label: 'Pedidos', icon: ClipboardList },
  { href: '/subscriptions', label: 'Assinaturas', icon: RefreshCw },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/accesses', label: 'Acessos', icon: KeyRound },
  { href: '/webhooks', label: 'Webhooks', icon: Zap },
  { href: '/withdrawals', label: 'Saques', icon: Landmark },
  { href: '/gateways', label: 'Gateways', icon: CreditCard },
  { href: '/config', label: 'Configurações', icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 bg-slate-800 flex flex-col">
            <div className="px-5 py-5 border-b border-slate-700">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Sales Bot</p>
            </div>
            <nav className="flex-1 py-4 space-y-0.5 px-2">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Icon size={15} className="shrink-0 opacity-80" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">v0.1.0</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
