import Link from 'next/link';
import { loginAction } from '@/lib/actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">T</div>
          <span className="text-white font-semibold text-lg">TenantSales</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Venda no Telegram.<br />
            <span className="text-indigo-400">Receba na hora.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Configure seu bot, cadastre produtos e receba pagamentos automáticos direto no Telegram.
          </p>
          <div className="mt-10 space-y-3">
            {['🤖 Bot Telegram configurado em minutos', '💳 Pix e Cartão integrados', '📊 Dashboard em tempo real'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-gray-300 text-sm">{f}</div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-xs">© 2026 TenantSales</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">T</div>
            <span className="font-semibold text-gray-900">TenantSales</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-500 mt-1">Entre na sua conta para continuar</p>
          </div>

          {!!searchParams.error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> E-mail ou senha incorretos.
            </div>
          )}

          <form action={loginAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm mt-2"
            >
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link href="/register" className="text-indigo-600 font-medium hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
