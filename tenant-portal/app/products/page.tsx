import { getProducts } from '@/lib/api';
import { createProductAction, deleteProductAction } from '@/lib/actions';
import { Badge } from '@/components/Badge';

function productTypeBadge(type: string) {
  return type === 'RECURRING' ? (
    <Badge label="Recorrente" variant="purple" />
  ) : (
    <Badge label="Único" variant="blue" />
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const res = await getProducts({ page, limit: '20' }).catch(() => ({
    data: [],
    total: 0,
    pages: 1,
  }));

  const products = (res as Record<string, unknown>).data as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {(res as Record<string, unknown>).total as number} produtos cadastrados
          </p>
        </div>
      </div>

      {/* Create form */}
      <details className="bg-white rounded-xl border border-gray-200 p-6">
        <summary className="cursor-pointer text-sm font-semibold text-indigo-600">
          + Novo produto
        </summary>
        <form action={createProductAction} className="mt-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              name="description"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              name="type"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ONE_TIME">Único</option>
              <option value="RECURRING">Recorrente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (RECURRING)</label>
            <select
              name="billingInterval"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">—</option>
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
              <option value="week">Semanal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dias de trial</label>
            <input
              name="trialDays"
              type="number"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID do grupo/canal</label>
            <input
              name="chatId"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="-100123456789"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Criar produto
            </button>
          </div>
        </form>
      </details>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Chat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id as string} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name as string}</td>
                <td className="px-4 py-3">{productTypeBadge(p.type as string)}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  R$ {parseFloat(p.price as string).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{(p.chatId as string) ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <form
                    action={deleteProductAction.bind(null, p.id as string)}
                    onSubmit={() => confirm('Remover produto?')}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remover
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
