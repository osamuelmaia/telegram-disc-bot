import { getSubscriptions } from '@/lib/api';
import type { Subscription } from '@/lib/types';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { cancelSubscriptionAction } from '@/lib/actions';

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

function userLabel(user?: Subscription['user']) {
  if (!user) return '—';
  return user.username ? `@${user.username}` : (user.firstName ?? String(user.telegramId));
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const status = sp.status ?? '';

  const params: Record<string, string> = { page, limit: '20' };
  if (status) params.status = status;

  const result = await getSubscriptions(params);

  function buildHref(p: number) {
    const q = new URLSearchParams({ page: String(p), ...(status && { status }) });
    return `/subscriptions?${q}`;
  }

  const STATUSES = ['', 'PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'EXPIRED'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Assinaturas</h1>

      <form method="GET" className="flex gap-3 mb-6">
        <select
          name="status"
          defaultValue={status}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'Todos os status'}</option>
          ))}
        </select>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['ID', 'Cliente', 'Produto', 'Valor', 'Status', 'Próx. cobrança', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma assinatura encontrada.</td>
              </tr>
            )}
            {result.data.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">{userLabel(s.user)}</td>
                <td className="px-4 py-3">{s.product?.name ?? '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {s.product?.price
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.product.price))
                    : '—'}
                </td>
                <td className="px-4 py-3"><Badge value={s.status} /></td>
                <td className="px-4 py-3 text-gray-500">
                  {s.currentPeriodEnd
                    ? new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(s.status) && (
                    <form
                      action={async () => {
                        'use server';
                        await cancelSubscriptionAction(s.id, false);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 hover:border-red-400 px-2 py-1 rounded"
                      >
                        Cancelar
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={result.page} pages={result.pages} total={result.total} buildHref={buildHref} />
      </div>
    </div>
  );
}
