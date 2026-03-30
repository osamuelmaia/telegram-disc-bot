'use client';

import { useState, useTransition } from 'react';
import { upsertPlatformGatewayAction, setPlatformGatewayActiveAction } from '@/lib/actions';

// ── EFI (Gerencianet/EFI Bank) fields ────────────────────────────────────────

const EFI_FIELDS: { key: string; label: string; placeholder: string; secret?: boolean }[] = [
  { key: 'clientId', label: 'Client ID', placeholder: 'Client_Id_...' },
  { key: 'clientSecret', label: 'Client Secret', placeholder: 'Client_Secret_...', secret: true },
  { key: 'pixKey', label: 'Chave Pix', placeholder: 'e-mail, CPF, CNPJ ou aleatória' },
  { key: 'sandbox', label: 'Sandbox (true/false)', placeholder: 'false' },
];

const STRIPE_FIELDS: { key: string; label: string; placeholder: string; secret?: boolean }[] = [
  { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
  { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
];

// ── GatewayCard ───────────────────────────────────────────────────────────────

function GatewayCard({
  type,
  title,
  description,
  fields,
}: {
  type: string;
  title: string;
  description: string;
  fields: typeof EFI_FIELDS;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await upsertPlatformGatewayAction(type, formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar');
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
            <input
              name={f.key}
              type={f.secret ? 'password' : 'text'}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {pending ? 'Salvando…' : 'Salvar credenciais'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Salvo!</span>}
        </div>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GatewaysPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gateways de Pagamento</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Credenciais configuradas aqui são usadas por todos os parceiros como fallback quando não possuem gateway próprio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <GatewayCard
          type="EFI"
          title="EFI Bank (Gerencianet) — Pix"
          description="Credenciais da API EFI para cobranças Pix."
          fields={EFI_FIELDS}
        />
        <GatewayCard
          type="STRIPE"
          title="Stripe — Cartão / Assinaturas"
          description="Chaves da API Stripe para pagamentos recorrentes e cartão de crédito."
          fields={STRIPE_FIELDS}
        />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        As credenciais são armazenadas criptografadas com AES-256-GCM. Preencha apenas os campos que deseja atualizar — campos em branco não sobrescrevem valores existentes.
      </p>
    </div>
  );
}
