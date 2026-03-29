'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  CreditCard,
  Package,
  ShoppingBag,
  Wallet,
  CircleUser,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions';
import OnboardingBanner from './OnboardingBanner';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/bot', label: 'Meu Bot', icon: Bot },
  { href: '/gateways', label: 'Pagamentos', icon: CreditCard },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/sales', label: 'Vendas', icon: ShoppingBag },
  { href: '/wallet', label: 'Carteira', icon: Wallet },
  { href: '/info', label: 'Minha Conta', icon: CircleUser },
];

const AUTH_ROUTES = ['/login', '/register'];

export default function AppShell({
  children,
  hasToken,
  profileCompleted,
}: {
  children: React.ReactNode;
  hasToken: boolean;
  profileCompleted: boolean;
}) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuth) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">T</div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-none truncate">TenantSales</p>
              <p className="text-gray-400 text-xs mt-0.5">Painel do parceiro</p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-gray-700/50" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
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
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 h-px bg-gray-700/50" />

        {/* Logout */}
        {hasToken && (
          <div className="px-3 py-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <LogOut size={16} className="shrink-0" />
                Sair
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {!profileCompleted && <OnboardingBanner />}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
