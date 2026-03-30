import { getWallet, getOrders, getSubscriptions, getWalletTransactions } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowDownLeft,
} from 'lucide-react';
import SparklineChart from '@/components/SparklineChart';
import PeriodSelector from '@/components/PeriodSelector';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function pct(num: number, den: number) {
  if (den === 0) return '0';
  return ((num / den) * 100).toFixed(1);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor = 'text-slate-500',
  iconBg = 'bg-slate-100',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const PERIOD_MS: Record<string, number> = {
  today: 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const period = (searchParams.period ?? 'today') as string;
  const cutoff = Date.now() - (PERIOD_MS[period] ?? PERIOD_MS['today']);

  const [wallet, ordersRes, subsRes, txRes] = await Promise.all([
    getWallet().catch(() => ({} as Record<string, unknown>)),
    getOrders({ limit: '200' }).catch(() => ({ data: [], total: 0 })),
    getSubscriptions({ limit: '1', status: 'ACTIVE' }).catch(() => ({ total: 0 })),
    getWalletTransactions({ limit: '500' }).catch(() => ({ data: [] })),
  ]);

  const balance = parseFloat((wallet.balance as string) ?? '0') || 0;
  const totalReceived = parseFloat((wallet.totalReceived as string) ?? '0') || 0;
  const totalWithdrawn = parseFloat((wallet.totalWithdrawn as string) ?? '0') || 0;

  const allOrders = ((ordersRes as Record<string, unknown>).data as Record<string, unknown>[]) ?? [];
  const totalOrdersAll = Number((ordersRes as Record<string, unknown>).total ?? 0);

  // Filter orders by period
  const periodOrders = allOrders.filter(
    (o) => new Date(o.createdAt as string).getTime() >= cutoff,
  );
  const paidOrders = periodOrders.filter(
    (o) => o.status === 'PAID' || o.status === 'DELIVERED',
  ).length;
  const pendingOrders = periodOrders.filter((o) => o.status === 'PENDING').length;

  const totalSubs = Number((subsRes as Record<string, unknown>).total ?? 0);

  // Wallet transactions filtered by period → chart data
  const allTxs = ((txRes as Record<string, unknown>).data as Record<string, unknown>[]) ?? [];
  const creditTxs = allTxs
    .filter(
      (t) =>
        (t.type as string).startsWith('CREDIT') &&
        new Date(t.createdAt as string).getTime() >= cutoff,
    )
    .sort((a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime());

  // Cumulative revenue for chart
  let cum = 0;
  const chartPoints = creditTxs.map((t) => ({
    x: new Date(t.createdAt as string).getTime(),
    y: (cum += parseFloat(t.amount as string) || 0),
  }));

  // Period revenue = sum of credits in period
  const periodRevenue = creditTxs.reduce((s, t) => s + (parseFloat(t.amount as string) || 0), 0);

  const approvalRate = pct(paidOrders, periodOrders.length);
  const netAmount = totalReceived - totalWithdrawn;

  const periodLabel = period === 'today' ? 'hoje' : period === '7d' ? 'nos últimos 7 dias' : 'nos últimos 30 dias';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <PeriodSelector current={period} />
      </div>

      {/* Main grid: chart (left) + metric cards (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Faturamento bruto
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">
                R$ {fmt(periodRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              R$ {fmt(periodRevenue)}
            </span>
          </div>

          <div className="h-36 mt-5">
            <SparklineChart
              points={
                chartPoints.length >= 2
                  ? chartPoints
                  : [
                      { x: cutoff, y: 0 },
                      { x: Date.now(), y: 0 },
                    ]
              }
            />
          </div>

          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>
              {new Date(cutoff).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: period === 'today' ? '2-digit' : undefined,
                minute: period === 'today' ? '2-digit' : undefined,
              })}
            </span>
            <span>
              {new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: period === 'today' ? '2-digit' : undefined,
                minute: period === 'today' ? '2-digit' : undefined,
              })}
            </span>
          </div>
        </div>

        {/* Right cards */}
        <div className="flex flex-col gap-4">
          <MetricCard
            icon={DollarSign}
            label="Valor líquido"
            value={`R$ ${fmt(netAmount)}`}
            sub="Após taxas e saques"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="Vendas"
            value={String(periodOrders.length)}
            sub={`${paidOrders} aprovadas`}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <MetricCard
            icon={RefreshCw}
            label="Assinaturas ativas"
            value={String(totalSubs)}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>
      </div>

      {/* Bottom stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle}
          label="Taxa de aprovação"
          value={`${approvalRate} %`}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <MetricCard
          icon={Wallet}
          label="Saldo disponível"
          value={`R$ ${fmt(balance)}`}
          sub="Para saque"
        />
        <MetricCard
          icon={Clock}
          label="Pedidos pendentes"
          value={String(pendingOrders)}
          sub={periodLabel}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
        />
        <MetricCard
          icon={ArrowDownLeft}
          label="Total sacado"
          value={`R$ ${fmt(totalWithdrawn)}`}
          sub={`de ${totalOrdersAll} pedidos`}
        />
      </div>
    </div>
  );
}
