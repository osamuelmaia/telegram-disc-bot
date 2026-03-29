import { getOrders } from '@/lib/api';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';

interface Props {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}

function userLabel(user?: Order['user']) {
  if (!user) return '—';
  return user.username ? `@${user.username}` : (user.firstName ?? String(user.telegramId));
}

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const status = sp.status ?? '';
  const search = sp.search ?? '';

  const params: Record<string, string> = { page, limit: '20' };
  if (status) params.status = status;
  if (search) params.search = search;

  const result = await getOrders(params);

  function buildHref(p: number) {
    const q = new URLSearchParams({ page: String(p), ...(status && { status }), ...(search && { search }) });
    return `/orders?${q}`;
  }

  const STATUSES = ['', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'CANCELLED'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="ID, nome ou @username…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'Todos os status'}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['ID', 'Cliente', 'Produto', 'Valor', 'Status', 'Criado em'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {result.data.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">{userLabel(o.user)}</td>
                <td className="px-4 py-3">{o.product?.name ?? '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: o.currency }).format(Number(o.amount))}
                </td>
                <td className="px-4 py-3">
                  <Badge value={o.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={result.page}
          pages={result.pages}
          total={result.total}
          buildHref={buildHref}
        />
      </div>
    </div>
  );
}
