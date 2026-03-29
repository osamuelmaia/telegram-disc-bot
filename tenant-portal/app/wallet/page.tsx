import { getWallet, getWalletTransactions } from '@/lib/api';
import { requestWithdrawalAction } from '@/lib/actions';
import { Badge } from '@/components/Badge';
import { StatsCard } from '@/components/StatsCard';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

function txBadge(type: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    CREDIT_SALE: { label: 'Venda', variant: 'green' },
    CREDIT_SUBSCRIPTION: { label: 'Assinatura', variant: 'green' },
    CREDIT_REFUND: { label: 'Estorno', variant: 'blue' },
    DEBIT_WITHDRAWAL: { label: 'Saque', variant: 'red' },
    DEBIT_FEE: { label: 'Taxa', variant: 'yellow' },
  };
  return map[type] ?? { label: type, variant: 'gray' };
}

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const [wallet, txRes] = await Promise.all([
    getWallet().catch(() => ({} as Record<string, unknown>)),
    getWalletTransactions({ page, limit: '20' }).catch(() => ({
      data: [],
      total: 0,
      pages: 1,
    })),
  ]);

  const balance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : 0;
  const totalEarned = typeof wallet.totalEarned === 'string' ? parseFloat(wallet.totalEarned) : 0;
  const totalWithdrawn = typeof wallet.totalWithdrawn === 'string' ? parseFloat(wallet.totalWithdrawn) : 0;
  const txs = (txRes as Record<string, unknown>).data as Record<string, unknown>[];
  const pages = (txRes as Record<string, unknown>).pages as number;
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carteira</h1>
        <p className="text-sm text-gray-500 mt-1">Saldo e histórico de transações.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Saldo disponível" value={`R$ ${balance.toFixed(2)}`} />
        <StatsCard title="Total recebido" value={`R$ ${totalEarned.toFixed(2)}`} />
        <StatsCard title="Total sacado" value={`R$ ${totalWithdrawn.toFixed(2)}`} />
      </div>

      {/* Withdrawal form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Solicitar saque</h2>
        <form action={requestWithdrawalAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-400">Máx: R$ {balance.toFixed(2)}</p>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            disabled={balance <= 0}
          >
            Solicitar
          </button>
        </form>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Extrato</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Saldo após</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {txs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                  Sem movimentações.
                </td>
              </tr>
            )}
            {txs.map((tx) => {
              const { label, variant } = txBadge(tx.type as string);
              const amount = parseFloat(tx.amount as string);
              const isCredit = (tx.type as string).startsWith('CREDIT');
              return (
                <tr key={tx.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge label={label} variant={variant} />
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                    {isCredit ? '+' : '-'}R$ {amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    R$ {parseFloat(tx.balanceAfter as string).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tx.createdAt as string).toLocaleString('pt-BR')}
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
