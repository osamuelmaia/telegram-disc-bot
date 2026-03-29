import { getOrders } from '@/lib/api';
import { Badge } from '@/components/Badge';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

function statusBadge(status: string): { label: string; variant: Variant } {
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const res = await getOrders({ page, limit: '30' }).catch(() => ({
    data: [],
    total: 0,
    pages: 1,
  }));

  const orders = (res as Record<string, unknown>).data as Record<string, unknown>[];
  const total = (res as Record<string, unknown>).total as number;
  const pages = (res as Record<string, unknown>).pages as number;
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">{total} pedidos no total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const { label, variant } = statusBadge(o.status as string);
              const user = o.user as Record<string, unknown> | undefined;
              const product = o.product as Record<string, unknown> | undefined;
              return (
                <tr key={o.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {(o.id as string).slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-700">{product?.name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user?.username ? `@${user.username as string}` : (user?.firstName as string) ?? (o.userId as string).slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    R$ {parseFloat(o.amount as string).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={label} variant={variant} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(o.createdAt as string).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex gap-2 justify-center text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}`}
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
      )}
    </div>
  );
}
