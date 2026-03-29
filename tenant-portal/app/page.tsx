import { getProfile, getWallet, getOrders, getSubscriptions } from '@/lib/api';
import { StatsCard } from '@/components/StatsCard';
import { updateProfileAction } from '@/lib/actions';

export default async function HomePage() {
  const [profile, wallet, ordersRes, subsRes] = await Promise.all([
    getProfile().catch(() => ({} as Record<string, unknown>)),
    getWallet().catch(() => ({} as Record<string, unknown>)),
    getOrders({ limit: '1' }).catch(() => ({ total: 0 })),
    getSubscriptions({ limit: '1' }).catch(() => ({ total: 0 })),
  ]);

  const balance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : 0;
  const totalOrders = (ordersRes as Record<string, unknown>).total ?? 0;
  const totalSubs = (subsRes as Record<string, unknown>).total ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bem-vindo, {(profile.name as string) ?? 'Parceiro'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Saldo disponível"
          value={`R$ ${balance.toFixed(2)}`}
        />
        <StatsCard title="Total de pedidos" value={String(totalOrders)} />
        <StatsCard title="Assinaturas ativas" value={String(totalSubs)} />
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Meu Perfil</h2>
        <form action={updateProfileAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              name="name"
              defaultValue={(profile.name as string) ?? ''}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de chave Pix</label>
              <select
                name="pixKeyType"
                defaultValue={(profile.pixKeyType as string) ?? ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
              <input
                name="pixKeyValue"
                defaultValue={(profile.pixKeyValue as string) ?? ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
