import { getFailedWebhooks } from '@/lib/api';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { retryWebhookAction } from '@/lib/actions';

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function WebhooksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ?? '1';

  const result = await getFailedWebhooks({ page, limit: '20' });

  function buildHref(p: number) {
    return `/webhooks?page=${p}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Webhooks com falha</h1>
      <p className="text-sm text-gray-500 mb-6">
        Eventos que falharam no processamento. Use &ldquo;Retentar&rdquo; para reprocessar.
      </p>

      {result.data.length === 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-sm">
          ✅ Nenhum webhook com falha no momento.
        </div>
      )}

      {result.data.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Gateway', 'Tipo', 'Tentativas', 'Erro', 'Recebido em', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.data.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{w.gateway}</td>
                  <td className="px-4 py-3 font-mono text-xs">{w.eventType}</td>
                  <td className="px-4 py-3">{w.attempts}</td>
                  <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate" title={w.error}>
                    {w.error ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(w.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3"><Badge value={w.status} /></td>
                  <td className="px-4 py-3">
                    <form
                      action={async () => {
                        'use server';
                        await retryWebhookAction(w.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded"
                      >
                        Retentar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={result.page} pages={result.pages} total={result.total} buildHref={buildHref} />
        </div>
      )}
    </div>
  );
}
