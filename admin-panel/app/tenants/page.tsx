import { getTenants } from '@/lib/api';
import { suspendTenantAction, activateTenantAction, updateTenantSettingsAction } from '@/lib/actions';
import type { Tenant } from '@/lib/types';

function StatusBadge({ status }: { status: Tenant['status'] }) {
  if (status === 'ACTIVE')
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Ativo</span>;
  if (status === 'PENDING')
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Suspenso</span>;
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
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Parceiro</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pedidos</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assinaturas</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Taxa %</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prazo cartão</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">
                  Nenhum parceiro encontrado.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const feeDisplay = t.platformFeePercent
                ? `${(parseFloat(t.platformFeePercent) * 100).toFixed(1)}%`
                : '—';
              const days = t.cardReleaseDays ?? 30;

              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate max-w-[160px]">{t.name ?? '—'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{t.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{t._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{t._count?.subscriptions ?? 0}</td>

                  {/* Taxa % — inline edit */}
                  <td className="px-4 py-3 text-center">
                    <form action={updateTenantSettingsAction.bind(null, t.id)} className="flex items-center justify-center gap-1">
                      <input
                        name="feePercent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={t.platformFeePercent ? (parseFloat(t.platformFeePercent) * 100).toFixed(1) : ''}
                        placeholder={feeDisplay}
                        className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input type="hidden" name="cardReleaseDays" value={days} />
                      <button type="submit" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">✓</button>
                    </form>
                  </td>

                  {/* Prazo cartão — 14 or 30 days toggle */}
                  <td className="px-4 py-3 text-center">
                    <form action={updateTenantSettingsAction.bind(null, t.id)} className="flex items-center justify-center gap-1">
                      <input type="hidden" name="feePercent" value={t.platformFeePercent ? (parseFloat(t.platformFeePercent) * 100).toFixed(1) : ''} />
                      <select
                        name="cardReleaseDays"
                        defaultValue={days}
                        className="border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                      >
                        <option value={14}>14 dias</option>
                        <option value={30}>30 dias</option>
                      </select>
                      <button type="submit" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">✓</button>
                    </form>
                  </td>

                  <td className="px-4 py-3 text-gray-500 text-xs">
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
