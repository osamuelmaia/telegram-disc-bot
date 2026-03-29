import { getTenants } from '@/lib/api';
import { suspendTenantAction, activateTenantAction } from '@/lib/actions';
import type { Tenant } from '@/lib/types';

function StatusBadge({ status }: { status: Tenant['status'] }) {
  return status === 'ACTIVE' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
      Suspenso
    </span>
  );
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = searchParams.page ?? '1';
  const res = await getTenants({ page, limit: '30' }).catch(() => ({
    data: [] as Tenant[],
    total: 0,
    pages: 1,
  }));

  const tenants = res.data;
  const total = res.total;
  const pages = res.pages;
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parceiros</h1>
        <p className="text-sm text-gray-500 mt-1">{total} parceiros cadastrados</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pedidos</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assinaturas</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                  Nenhum parceiro encontrado.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{t.email}</td>
                <td className="px-4 py-3 text-gray-600">{t.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{t._count?.orders ?? 0}</td>
                <td className="px-4 py-3 text-right text-gray-700">{t._count?.subscriptions ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  {t.status === 'ACTIVE' ? (
                    <form action={suspendTenantAction.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Suspender
                      </button>
                    </form>
                  ) : (
                    <form action={activateTenantAction.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="text-xs text-green-600 hover:text-green-800 transition-colors"
                      >
                        Ativar
                      </button>
                    </form>
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
              href={`?page=${p}`}
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
