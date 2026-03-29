import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { logoutAction } from '@/lib/actions';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard — TenantSales',
  description: 'Painel do parceiro',
};

const NAV = [
  { href: '/', label: 'Visão Geral', icon: '📊' },
  { href: '/bot', label: 'Bot', icon: '🤖' },
  { href: '/gateways', label: 'Gateways', icon: '💳' },
  { href: '/products', label: 'Produtos', icon: '📦' },
  { href: '/orders', label: 'Pedidos', icon: '🧾' },
  { href: '/subscriptions', label: 'Assinaturas', icon: '🔄' },
  { href: '/wallet', label: 'Carteira', icon: '💰' },
  { href: '/withdrawals', label: 'Saques', icon: '🏦' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('token')?.value;

  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 bg-slate-800 flex flex-col">
            <div className="px-5 py-5 border-b border-slate-700">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Parceiro</p>
              <p className="mt-0.5 text-sm font-semibold text-white">TenantSales</p>
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
            {token && (
              <div className="px-4 py-4 border-t border-slate-700">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Sair
                  </button>
                </form>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
