import { getCustomers } from '@/lib/api';
import type { Customer } from '@/lib/types';
import { Pagination } from '@/components/Pagination';

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

function displayName(c: Customer) {
  if (c.username) return `@${c.username}`;
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return name || String(c.telegramId);
}

export default async function CustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';
  const search = sp.search ?? '';

  const params: Record<string, string> = { page, limit: '20' };
  if (search) params.search = search;

  const result = await getCustomers(params);

  function buildHref(p: number) {
    const q = new URLSearchParams({ page: String(p), ...(search && { search }) });
    return `/customers?${q}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>

      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="Nome, @username…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Buscar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Cliente', 'Telegram ID', 'Pedidos', 'Assinaturas', 'Acessos', 'Cadastrado em'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum cliente encontrado.</td>
              </tr>
            )}
            {result.data.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">{displayName(c)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(c.telegramId)}</td>
                <td className="px-4 py-3">{c._count?.orders ?? 0}</td>
                <td className="px-4 py-3">{c._count?.subscriptions ?? 0}</td>
                <td className="px-4 py-3">{c._count?.accesses ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString('pt-BR')}
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
