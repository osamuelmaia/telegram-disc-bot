import { getPlatformConfig } from '@/lib/api';
import { updatePlatformConfigAction } from '@/lib/actions';

export default async function ConfigPage() {
  const config = await getPlatformConfig().catch(() => ({
    feePercent: 10,
    minWithdrawalAmount: 20,
    withdrawalPaymentDays: 3,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Plataforma</h1>
        <p className="text-sm text-gray-500 mt-1">Taxas e regras globais aplicadas a todos os parceiros.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <form action={updatePlatformConfigAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taxa da plataforma (%)
            </label>
            <input
              name="feePercent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              defaultValue={config.feePercent}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Percentual retido pela plataforma em cada venda/pagamento de assinatura.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saque mínimo (R$)
            </label>
            <input
              name="minWithdrawalAmount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={config.minWithdrawalAmount}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo de pagamento (dias úteis)
            </label>
            <input
              name="withdrawalPaymentDays"
              type="number"
              min="0"
              required
              defaultValue={config.withdrawalPaymentDays}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Prazo para pagamento do saque após aprovação.
            </p>
          </div>

          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Salvar configurações
          </button>
        </form>
      </div>
    </div>
  );
}
