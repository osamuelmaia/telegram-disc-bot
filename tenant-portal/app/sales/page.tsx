import Link from 'next/link';
import { getOrders, getSubscriptions } from '@/lib/api';
import { Badge } from '@/components/Badge';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

function orderStatusBadge(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    PAID: { label: 'Pago', variant: 'green' },
    PENDING: { label: 'Pendente', variant: 'yellow' },
    EXPIRED: { label: 'Expirado', variant: 'gray' },
    FAILED: { label: 'Falhou', variant: 'red' },
    REFUNDED: { label: 'Reembolsado', variant: 'blue' },
    CANCELLED: { label: 'Cancelado', variant: 'gray' },
  };
  return map[status] ?? { label: status, variant: 'gray' };
}

function subStatusBadge(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    ACTIVE: { label: 'Ativa', variant: 'green' },
    TRIALING: { label: 'Trial', variant: 'blue' },
    PENDING: { label: 'Pendente', variant: 'yellow' },
    PAST_DUE: { label: 'Vencida', variant: 'red' },
    UNPAID: { label: 'Não paga', variant: 'red' },
    CANCELLED: { label: 'Cancelada', variant: 'gray' },
    EXPIRED: { label: 'Expirada', variant: 'gray' },
  };
  return map[status] ?? { label: status, variant: 'gray' };
}

function Pagination({ pages, currentPage, tab }: { pages: number; currentPage: number; tab: string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex gap-2 justify-center text-sm pt-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <a
          key={p}
          href={`?tab=${tab}&page=${p}`}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            p === currentPage
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {p}
        </a>
      ))}
    </div>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const tab = searchParams.tab === 'subscriptions' ? 'subscriptions' : 'orders';
  const page = searchParams.page ?? '1';

  const [ordersRes, subsRes] = await Promise.all([
    getOrders({ page: tab === 'orders' ? page : '1', limit: '30' }).catch(() => ({ data: [], total: 0, pages: 1 })),
    getSubscriptions({ page: tab === 'subscriptions' ? page : '1', limit: '30' }).catch(() => ({ data: [], total: 0, pages: 1 })),
  ]);

  const orders = (ordersRes as Record<string, unknown>).data as Record<string, unknown>[];
  const orderTotal = (ordersRes as Record<string, unknown>).total as number;
  const orderPages = (ordersRes as Record<string, unknown>).pages as number;

  const subs = (subsRes as Record<string, unknown>).data as Record<string, unknown>[];
  const subTotal = (subsRes as Record<string, unknown>).total as number;
  const subPages = (subsRes as Record<string, unknown>).pages as number;

  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orderTotal} pedido{orderTotal !== 1 ? 's' : ''} · {subTotal} assinatura{subTotal !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <Link
          href="?tab=orders&page=1"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'orders'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pedidos{orderTotal > 0 && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{orderTotal}</span>}
        </Link>
        <Link
          href="?tab=subscriptions&page=1"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'subscriptions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Assinaturas{subTotal > 0 && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{subTotal}</span>}
        </Link>
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Gateway</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      <p className="font-medium text-gray-500">Nenhum pedido ainda</p>
                      <p className="text-xs mt-1">Os pedidos aparecerão aqui quando seus clientes comprarem.</p>
                    </td>
                  </tr>
                )}
                {orders.map((o) => {
                  const { label, variant } = orderStatusBadge(o.status as string);
                  const user = o.user as Record<string, unknown> | undefined;
                  const product = o.product as Record<string, unknown> | undefined;
                  return (
                    <tr key={o.id as string} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{(product?.name as string) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {user?.username ? `@${user.username as string}` : ((user?.firstName as string) ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs uppercase">{o.gateway as string}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                        R$ {parseFloat(o.amount as string).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={label} variant={variant} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(o.createdAt as string).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pages={orderPages} currentPage={currentPage} tab="orders" />
        </div>
      )}

      {/* Subscriptions tab */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Gateway</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Próx. cobrança</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Criada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      <p className="font-medium text-gray-500">Nenhuma assinatura ainda</p>
                      <p className="text-xs mt-1">As assinaturas aparecerão aqui quando ativadas.</p>
                    </td>
                  </tr>
                )}
                {subs.map((s) => {
                  const { label, variant } = subStatusBadge(s.status as string);
                  const user = s.user as Record<string, unknown> | undefined;
                  const product = s.product as Record<string, unknown> | undefined;
                  return (
                    <tr key={s.id as string} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{(product?.name as string) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {user?.username ? `@${user.username as string}` : ((user?.firstName as string) ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs uppercase">{s.gateway as string}</td>
                      <td className="px-4 py-3">
                        <Badge label={label} variant={variant} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.currentPeriodEnd
                          ? new Date(s.currentPeriodEnd as string).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(s.createdAt as string).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pages={subPages} currentPage={currentPage} tab="subscriptions" />
        </div>
      )}
    </div>
  );
}
