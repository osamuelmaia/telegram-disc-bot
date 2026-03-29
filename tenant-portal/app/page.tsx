import Link from 'next/link';
import { getProfile, getWallet, getOrders, getSubscriptions } from '@/lib/api';
import { updateProfileAction } from '@/lib/actions';
import { Bot, CreditCard, Package, ArrowRight, TrendingUp, Users, RefreshCw } from 'lucide-react';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function QuickLink({ href, icon: Icon, label, description }: { href: string; icon: React.ElementType; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight size={14} className="text-gray-400 shrink-0 group-hover:text-indigo-500 transition-colors" />
    </Link>
  );
}

export default async function HomePage() {
  const [profile, wallet, ordersRes, subsRes] = await Promise.all([
    getProfile().catch(() => ({} as Record<string, unknown>)),
    getWallet().catch(() => ({} as Record<string, unknown>)),
    getOrders({ limit: '1' }).catch(() => ({ total: 0 })),
    getSubscriptions({ limit: '1', status: 'ACTIVE' }).catch(() => ({ total: 0 })),
  ]);

  const balance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : 0;
  const totalReceived = typeof wallet.totalReceived === 'string' ? parseFloat(wallet.totalReceived) : 0;
  const totalOrders = Number((ordersRes as Record<string, unknown>).total ?? 0);
  const totalSubs = Number((subsRes as Record<string, unknown>).total ?? 0);

  const name = (profile.name as string) ?? 'Parceiro';
  const hasBot = !!(profile as Record<string, unknown>).botId;
  const hasGateway = false; // will show setup prompt if needed

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Aqui está o resumo da sua conta.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo disponível</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">R$ {fmt(balance)}</p>
          <Link href="/wallet" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Ver carteira →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total recebido</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">R$ {fmt(totalReceived)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-gray-400" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pedidos</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <Link href="/sales" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Ver vendas →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={13} className="text-gray-400" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assinaturas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSubs}</p>
          <Link href="/sales?tab=subscriptions" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Ver assinaturas →</Link>
        </div>
      </div>

      {/* Quick setup links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Configurações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            href="/bot"
            icon={Bot}
            label="Meu Bot"
            description="Configure o token e mensagem de boas-vindas"
          />
          <QuickLink
            href="/gateways"
            icon={CreditCard}
            label="Pagamentos"
            description="Conecte EFI ou Stripe para receber"
          />
          <QuickLink
            href="/products"
            icon={Package}
            label="Produtos"
            description="Crie e gerencie seus produtos"
          />
        </div>
      </div>

      {/* Profile quick edit */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Perfil rápido</h2>
        <form action={updateProfileAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              name="name"
              defaultValue={(profile.name as string) ?? ''}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de chave Pix</label>
              <select
                name="pixKeyType"
                defaultValue={(profile.pixKeyType as string) ?? ''}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
              >
                <option value="">Selecione</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Aleatória</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave Pix</label>
              <input
                name="pixKeyValue"
                defaultValue={(profile.pixKeyValue as string) ?? ''}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Salvar alterações
          </button>
        </form>
      </div>
    </div>
  );
}
