import { getProducts } from '@/lib/api';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { createProductAction, deleteProductAction } from '@/lib/actions';

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';

  const result = await getProducts({ page, limit: '20' });

  function buildHref(p: number) {
    return `/products?page=${p}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Produtos</h1>

      {/* Formulário de criação */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Novo produto</h2>
        <form action={createProductAction} className="grid grid-cols-2 gap-4">
          <input name="name" required placeholder="Nome *" className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="description" placeholder="Descrição" className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Tipo *</label>
            <select name="type" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="ONE_TIME">ONE_TIME (Pix avulso)</option>
              <option value="RECURRING">RECURRING (Assinatura)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Preço (R$) *</label>
            <input name="price" type="number" step="0.01" min="0" required placeholder="99.90" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Intervalo (RECURRING)</label>
            <select name="billingInterval" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">—</option>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
              <option value="WEEKLY">Semanal</option>
              <option value="QUARTERLY">Trimestral</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Trial (dias)</label>
            <input name="trialDays" type="number" min="0" placeholder="0" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs text-gray-500">Chat ID do Telegram (grupo/canal)</label>
            <input name="chatId" placeholder="-1001234567890" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="col-span-2 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg">
              Criar produto
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nome', 'Tipo', 'Preço', 'Intervalo', 'Chat ID', 'Status', 'Pedidos', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum produto cadastrado.</td>
              </tr>
            )}
            {result.data.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3"><Badge value={p.type} /></td>
                <td className="px-4 py-3">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.currency }).format(Number(p.price))}
                </td>
                <td className="px-4 py-3 text-gray-500">{p.billingInterval ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.chatId ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge value={p.active ? 'ACTIVE' : 'CANCELLED'} />
                </td>
                <td className="px-4 py-3">{p._count?.orders ?? 0}</td>
                <td className="px-4 py-3">
                  {p.active && (
                    <form
                      action={async () => {
                        'use server';
                        await deleteProductAction(p.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 hover:border-red-400 px-2 py-1 rounded"
                      >
                        Desativar
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
