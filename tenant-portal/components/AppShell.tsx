'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

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

const AUTH_ROUTES = ['/login', '/register'];

export default function AppShell({
  children,
  hasToken,
}: {
  children: React.ReactNode;
  hasToken: boolean;
}) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuth) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">T</div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">TenantSales</p>
              <p className="text-gray-400 text-xs mt-0.5">Painel do parceiro</p>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-gray-700/50" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 border-t border-gray-700/50" />

        {/* Footer */}
        {hasToken && (
          <div className="px-3 py-4">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <span className="text-base w-5 text-center">🚪</span>
                Sair
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
