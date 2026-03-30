import Link from 'next/link';
import { registerAction } from '@/lib/actions';

export default function RegisterPage({
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
            Comece a vender<br />
            <span className="text-indigo-400">em 5 minutos.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Crie sua conta, conecte seu bot do Telegram e cadastre seus produtos. Simples assim.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { step: '1', label: 'Crie sua conta' },
              { step: '2', label: 'Conecte seu bot Telegram' },
              { step: '3', label: 'Cadastre seus produtos' },
              { step: '4', label: 'Comece a receber' },
            ].map(({ step, label }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">{step}</div>
                <span className="text-gray-300 text-sm">{label}</span>
              </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Criar sua conta</h1>
            <p className="text-gray-500 mt-1">Grátis para começar</p>
          </div>

          {!!searchParams.error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span>{' '}
              {searchParams.error === 'exists' ? 'E-mail já cadastrado.' : 'Erro ao criar conta. Tente novamente.'}
            </div>
          )}

          <form action={registerAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Seu nome"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                name="email"
                type="email"
                required
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
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm mt-2"
            >
              Criar conta grátis
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
