import Link from 'next/link';
import { getWallet, getWalletTransactions, getWithdrawals, getProfile } from '@/lib/api';
import { requestWithdrawalAction } from '@/lib/actions';
import { Badge } from '@/components/Badge';
import PixKeyModal from '@/components/PixKeyModal';

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

function withdrawalStatusBadge(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    PENDING: { label: 'Pendente', variant: 'yellow' },
    APPROVED: { label: 'Aprovado', variant: 'blue' },
    PROCESSING: { label: 'Processando', variant: 'blue' },
    COMPLETED: { label: 'Concluído', variant: 'green' },
    REJECTED: { label: 'Rejeitado', variant: 'red' },
    FAILED: { label: 'Falhou', variant: 'red' },
  };
  return map[status] ?? { label: status, variant: 'gray' };
}

function fmt(val: string | number | unknown) {
  const n = typeof val === 'string' ? parseFloat(val) : (val as number);
  return isNaN(n) ? '0,00' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const tab = searchParams.tab === 'withdrawals' ? 'withdrawals' : 'balance';
  const page = searchParams.page ?? '1';

  const [wallet, txRes, withdrawalsRes, profile] = await Promise.all([
    getWallet().catch(() => ({} as Record<string, unknown>)),
    getWalletTransactions({ page: tab === 'balance' ? page : '1', limit: '20' }).catch(() => ({ data: [], total: 0, pages: 1 })),
    getWithdrawals({ page: tab === 'withdrawals' ? page : '1', limit: '20' }).catch(() => ({ data: [], total: 0, pages: 1 })),
    getProfile().catch(() => ({} as Record<string, unknown>)),
  ]);

  const balance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : 0;
  const totalReceived = typeof wallet.totalReceived === 'string' ? parseFloat(wallet.totalReceived) : 0;
  const totalWithdrawn = typeof wallet.totalWithdrawn === 'string' ? parseFloat(wallet.totalWithdrawn) : 0;

  const pixKeyType = (profile as Record<string, unknown>).pixKeyType as string | undefined;
  const pixKeyValue = (profile as Record<string, unknown>).pixKeyValue as string | undefined;

  const txs = (txRes as Record<string, unknown>).data as Record<string, unknown>[];
  const txPages = (txRes as Record<string, unknown>).pages as number;

  const withdrawals = (withdrawalsRes as Record<string, unknown>).data as Record<string, unknown>[];
  const wTotal = (withdrawalsRes as Record<string, unknown>).total as number;
  const wPages = (withdrawalsRes as Record<string, unknown>).pages as number;

  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carteira</h1>
        <p className="text-sm text-gray-500 mt-1">Saldo, extrato e saques</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo disponível</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {fmt(balance)}</p>
          <p className="text-xs text-gray-400 mt-1">Disponível para saque</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total recebido</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">Acumulado de vendas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total sacado</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {fmt(totalWithdrawn)}</p>
          <p className="text-xs text-gray-400 mt-1">{wTotal} saque{wTotal !== 1 ? 's' : ''} realizado{wTotal !== 1 ? 's' : ''}</p>
        </div>
        {/* Pix key card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chave Pix (saques)</p>
            {pixKeyValue ? (
              <>
                <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{pixKeyValue}</p>
                <p className="text-xs text-gray-400 mt-0.5">{pixKeyType}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">Não configurada</p>
            )}
          </div>
          <div className="mt-3">
            <PixKeyModal pixKeyType={pixKeyType} pixKeyValue={pixKeyValue} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <Link
          href="?tab=balance&page=1"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'balance'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Extrato
        </Link>
        <Link
          href="?tab=withdrawals&page=1"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'withdrawals'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Saques
          {wTotal > 0 && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{wTotal}</span>}
        </Link>
      </div>

      {/* Extrato tab */}
      {tab === 'balance' && (
        <div className="space-y-5">
          {/* Withdrawal form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Solicitar saque</h2>
            {balance <= 0 ? (
              <p className="text-sm text-gray-500">Você não possui saldo disponível para saque.</p>
            ) : (
              <form action={requestWithdrawalAction} className="flex items-end gap-3">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`máx. R$ ${fmt(balance)}`}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Solicitar saque
                </button>
              </form>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Histórico de transações</h2>
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
                    <td colSpan={4} className="text-center py-12 text-sm">
                      <p className="font-medium text-gray-500">Sem movimentações</p>
                      <p className="text-xs text-gray-400 mt-1">As transações aparecerão aqui após as primeiras vendas.</p>
                    </td>
                  </tr>
                )}
                {txs.map((tx) => {
                  const { label, variant } = txBadge(tx.type as string);
                  const amount = parseFloat(tx.amount as string);
                  const isCredit = (tx.type as string).startsWith('CREDIT');
                  return (
                    <tr key={tx.id as string} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge label={label} variant={variant} />
                        {tx.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{tx.description as string}</p>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${isCredit ? 'text-green-700' : 'text-red-600'}`}>
                        {isCredit ? '+' : '−'}R$ {fmt(amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                        R$ {fmt(tx.balanceAfter as string)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(tx.createdAt as string).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pages={txPages} currentPage={currentPage} tab="balance" />
        </div>
      )}

      {/* Saques tab */}
      {tab === 'withdrawals' && (
        <div className="space-y-5">
          {/* Withdrawal request form inline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Novo saque</h2>
            {balance <= 0 ? (
              <p className="text-sm text-gray-500">Você não possui saldo disponível para saque.</p>
            ) : (
              <form action={requestWithdrawalAction} className="flex items-end gap-3">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`máx. R$ ${fmt(balance)}`}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Solicitar saque
                </button>
              </form>
            )}
          </div>

          {/* Withdrawals table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Histórico de saques</h2>
            </div>
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
                    <td colSpan={5} className="text-center py-12 text-sm">
                      <p className="font-medium text-gray-500">Nenhum saque solicitado</p>
                      <p className="text-xs text-gray-400 mt-1">Seus saques aparecerão aqui após a solicitação.</p>
                    </td>
                  </tr>
                )}
                {withdrawals.map((w) => {
                  const { label, variant } = withdrawalStatusBadge(w.status as string);
                  return (
                    <tr key={w.id as string} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        R$ {fmt(w.amount as string)}
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
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {w.approvedAt
                          ? new Date(w.approvedAt as string).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(w.createdAt as string).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pages={wPages} currentPage={currentPage} tab="withdrawals" />
        </div>
      )}
    </div>
  );
}
