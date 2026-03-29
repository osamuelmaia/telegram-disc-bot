import { getBot } from '@/lib/api';
import { upsertBotAction } from '@/lib/actions';

export default async function BotPage() {
  const bot = await getBot().catch(() => ({} as Record<string, unknown>));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuração do Bot</h1>
        <p className="text-sm text-gray-500 mt-1">Configure o token e as mensagens do seu bot Telegram.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form action={upsertBotAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token do Bot</label>
            <input
              name="token"
              type="password"
              placeholder="123456:ABC..."
              defaultValue={(bot.token as string) ?? ''}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <p className="mt-1 text-xs text-gray-400">Obtido via @BotFather no Telegram.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de boas-vindas</label>
            <textarea
              name="welcomeMessage"
              rows={4}
              defaultValue={(bot.welcomeMessage as string) ?? ''}
              placeholder="Olá! Seja bem-vindo..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contato de suporte</label>
            <input
              name="supportContact"
              defaultValue={(bot.supportContact as string) ?? ''}
              placeholder="@seususporte"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Salvar e Reiniciar Bot
          </button>
        </form>
      </div>

      {bot.username && (
        <p className="text-sm text-gray-500">
          Bot ativo:{' '}
          <a
            href={`https://t.me/${bot.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            @{bot.username as string}
          </a>
        </p>
      )}
    </div>
  );
}
