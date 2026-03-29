import { getGateways } from '@/lib/api';
import { upsertGatewayAction } from '@/lib/actions';

export default async function GatewaysPage() {
  const gateways = await getGateways().catch(() => [] as Record<string, unknown>[]);

  const efi = gateways.find((g) => g.type === 'EFI') ?? {};
  const stripe = gateways.find((g) => g.type === 'STRIPE') ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gateways de Pagamento</h1>
        <p className="text-sm text-gray-500 mt-1">Configure suas credenciais de recebimento.</p>
      </div>

      {/* EFI / Gerencianet */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold text-gray-900 mb-4">EFI (Gerencianet) — Pix</h2>
        <form action={upsertGatewayAction} className="space-y-4">
          <input type="hidden" name="type" value="EFI" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input
              name="clientId"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Client_Id_..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              name="clientSecret"
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
            <input
              name="pixKey"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="sua@chave.pix"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret (opcional)</label>
            <input
              name="webhookSecret"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="sandbox" value="true" id="efi-sandbox" className="rounded" />
            <label htmlFor="efi-sandbox" className="text-sm text-gray-700">Modo sandbox</label>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Salvar EFI
            </button>
            {!!efi.active && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">Ativo</span>
            )}
          </div>
        </form>
      </div>

      {/* Stripe */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Stripe — Cartão / Assinaturas</h2>
        <form action={upsertGatewayAction} className="space-y-4">
          <input type="hidden" name="type" value="STRIPE" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input
              name="secretKey"
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="sk_..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            <input
              name="webhookSecret"
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="whsec_..."
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Salvar Stripe
            </button>
            {!!stripe.active && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">Ativo</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
