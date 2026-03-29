import { getAdminWithdrawals } from '@/lib/api';
import { approveWithdrawalAction, rejectWithdrawalAction } from '@/lib/actions';
import type { WithdrawalRequest } from '@/lib/types';

function StatusBadge({ status }: { status: WithdrawalRequest['status'] }) {
  const map = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PAID: 'bg-blue-100 text-blue-800',
  };
  const labels = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', PAID: 'Pago' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const statusFilter = searchParams.status ?? '';
  const res = await getAdminWithdrawals({
    page,
    limit: '30',
    ...(statusFilter ? { status: statusFilter } : {}),
  }).catch(() => ({ data: [] as WithdrawalRequest[], total: 0, pages: 1 }));

  const withdrawals = res.data;
  const total = res.total;
  const pages = res.pages;
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saques</h1>
          <p className="text-sm text-gray-500 mt-1">{total} solicitações</p>
        </div>
        <div className="flex gap-2 text-sm">
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => (
            <a
              key={s}
              href={s ? `?status=${s}` : '?'}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                statusFilter === s
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s || 'Todos'}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Parceiro</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Chave Pix</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Solicitado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma solicitação de saque.
                </td>
              </tr>
            )}
            {withdrawals.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">
                  {w.tenant?.name ?? w.tenant?.email ?? w.tenantId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  R$ {parseFloat(w.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {w.pixKeyValue ?? '—'}
                  {w.pixKeyType && (
                    <span className="ml-1 text-gray-400">({w.pixKeyType})</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  {w.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <form action={approveWithdrawalAction.bind(null, w.id)}>
                        <button
                          type="submit"
                          className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
                        >
                          Aprovar
                        </button>
                      </form>
                      <details className="relative">
                        <summary className="text-xs text-red-500 hover:text-red-700 cursor-pointer list-none font-medium">
                          Rejeitar
                        </summary>
                        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-56">
                          <form
                            action={async (fd) => {
                              'use server';
                              await rejectWithdrawalAction(w.id, fd.get('reason') as string);
                            }}
                            className="space-y-2"
                          >
                            <input
                              name="reason"
                              placeholder="Motivo"
                              required
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-red-400"
                            />
                            <button
                              type="submit"
                              className="w-full bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs font-medium transition-colors"
                            >
                              Confirmar rejeição
                            </button>
                          </form>
                        </div>
                      </details>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex gap-2 justify-center text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                p === currentPage
                  ? 'bg-slate-700 text-white border-slate-700'
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
