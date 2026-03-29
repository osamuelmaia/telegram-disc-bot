import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin — Telegram Sales Bot',
  description: 'Painel administrativo',
};

const NAV = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/orders', label: 'Pedidos', icon: '🧾' },
  { href: '/subscriptions', label: 'Assinaturas', icon: '🔄' },
  { href: '/customers', label: 'Clientes', icon: '👥' },
  { href: '/products', label: 'Produtos', icon: '📦' },
  { href: '/accesses', label: 'Acessos', icon: '🔑' },
  { href: '/webhooks', label: 'Webhooks', icon: '⚡' },
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
              {NAV.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <span className="text-base">{icon}</span>
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
