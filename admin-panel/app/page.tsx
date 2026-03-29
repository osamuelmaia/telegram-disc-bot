import { getDashboardStats } from '@/lib/api';
import { StatsCard } from '@/components/StatsCard';

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default async function DashboardPage() {
  let stats;
  try {
    stats = await getDashboardStats();
  } catch {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-6">
        Não foi possível conectar ao backend. Verifique <code>ADMIN_API_URL</code> e{' '}
        <code>ADMIN_API_KEY</code>.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Receita */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Receita (Pix)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="Hoje" value={fmt(stats.revenue.today)} accent="green" />
          <StatsCard title="Este mês" value={fmt(stats.revenue.thisMonth)} accent="green" />
          <StatsCard title="Total" value={fmt(stats.revenue.total)} accent="green" />
        </div>
      </section>

      {/* Pedidos */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Pedidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard title="Total" value={stats.orders.total} accent="blue" />
          <StatsCard title="Pagos" value={stats.orders.paid} accent="green" />
          <StatsCard title="Aguardando" value={stats.orders.pending} accent="orange" />
          <StatsCard title="Falhou" value={stats.orders.failed} accent="red" />
        </div>
      </section>

      {/* Assinaturas */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Assinaturas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard title="Ativas" value={stats.subscriptions.active} accent="green" />
          <StatsCard title="Trial" value={stats.subscriptions.trialing} accent="blue" />
          <StatsCard title="Em atraso" value={stats.subscriptions.pastDue} accent="orange" />
          <StatsCard title="Canceladas" value={stats.subscriptions.cancelled} accent="red" />
        </div>
      </section>

      {/* Outros */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Geral</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard
            title="Clientes"
            value={stats.customers.total}
            sub={`+${stats.customers.newToday} hoje · +${stats.customers.newThisMonth} no mês`}
            accent="purple"
          />
          <StatsCard title="Acessos ativos" value={stats.accesses.active} accent="green" />
          <StatsCard title="Acessos revogados" value={stats.accesses.revoked} accent="red" />
          <StatsCard
            title="Webhooks falhos"
            value={stats.webhooks.failed}
            accent={stats.webhooks.failed > 0 ? 'red' : 'default'}
          />
        </div>
      </section>
    </div>
  );
}
