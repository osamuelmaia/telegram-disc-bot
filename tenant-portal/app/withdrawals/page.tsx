import { getWithdrawals } from '@/lib/api';
import { Badge } from '@/components/Badge';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

function statusBadge(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    PENDING: { label: 'Pendente', variant: 'yellow' },
    APPROVED: { label: 'Aprovado', variant: 'green' },
    REJECTED: { label: 'Rejeitado', variant: 'red' },
    PAID: { label: 'Pago', variant: 'blue' },
  };
  return map[status] ?? { label: status, variant: 'gray' };
}

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const res = await getWithdrawals({ page, limit: '30' }).catch(() => ({
    data: [],
    total: 0,
    pages: 1,
  }));

  const withdrawals = (res as Record<string, unknown>).data as Record<string, unknown>[];
  const total = (res as Record<string, unknown>).total as number;
  const pages = (res as Record<string, unknown>).pages as number;
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saques</h1>
        <p className="text-sm text-gray-500 mt-1">{total} solicitações no total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Chave Pix</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Processado em</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Solicitado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma solicitação de saque.
                </td>
              </tr>
            )}
            {withdrawals.map((w) => {
              const { label, variant } = statusBadge(w.status as string);
              return (
                <tr key={w.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    R$ {parseFloat(w.amount as string).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {(w.pixKeyValue as string) ?? '—'}
                    {!!w.pixKeyType && (
                      <span className="ml-1 text-gray-400">({w.pixKeyType as string})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={label} variant={variant} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {w.processedAt
                      ? new Date(w.processedAt as string).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(w.createdAt as string).toLocaleDateString('pt-BR')}
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
