import { getAccesses } from '@/lib/api';
import type { Access } from '@/lib/types';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { grantAccessAction, revokeAccessAction } from '@/lib/actions';

interface Props {
  searchParams: Promise<{ page?: string; status?: string; userId?: string; productId?: string }>;
}

function userLabel(user?: Access['user']) {
  if (!user) return '—';
  return user.username ? `@${user.username}` : (user.firstName ?? String(user.telegramId));
}

export default async function AccessesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const status = sp.status ?? '';

  const params: Record<string, string> = { page, limit: '20' };
  if (status) params.status = status;
  if (sp.userId) params.userId = sp.userId;
  if (sp.productId) params.productId = sp.productId;

  const result = await getAccesses(params);

  function buildHref(p: number) {
    const q = new URLSearchParams({ page: String(p), ...(status && { status }) });
    return `/accesses?${q}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Acessos</h1>

      {/* Grant manual */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Conceder acesso manual</h2>
        <form action={grantAccessAction} className="grid grid-cols-2 gap-4">
          <input name="userId" required placeholder="User ID (interno) *" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="productId" required placeholder="Product ID *" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="chatId" required placeholder="Chat ID do Telegram *" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="expiresAt" type="datetime-local" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg">
              Conceder acesso
            </button>
          </div>
        </form>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex gap-3 mb-6">
        <select
          name="status"
          defaultValue={status}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="REVOKED">REVOKED</option>
        </select>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Cliente', 'Produto', 'Chat ID', 'Status', 'Concedido em', 'Expira em', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum acesso encontrado.</td>
              </tr>
            )}
            {result.data.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">{userLabel(a.user)}</td>
                <td className="px-4 py-3">{a.product?.name ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.chatId}</td>
                <td className="px-4 py-3"><Badge value={a.status} /></td>
                <td className="px-4 py-3 text-gray-500">{new Date(a.grantedAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-gray-500">
                  {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3">
                  {a.status === 'ACTIVE' && (
                    <form
                      action={async () => {
                        'use server';
                        await revokeAccessAction(a.id, 'admin_revoked');
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 hover:border-red-400 px-2 py-1 rounded"
                      >
                        Revogar
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
