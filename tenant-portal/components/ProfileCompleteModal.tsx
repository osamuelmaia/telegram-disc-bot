'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { completeProfileAction } from '@/lib/actions';

export default function ProfileCompleteModal({ onClose }: { onClose: () => void }) {
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [success, setSuccess] = useState(false);

  async function fetchAddress(value: string) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(`${data.logradouro}, ${data.bairro}, ${data.localidade} — ${data.uf}`);
      }
    } catch {}
    setLoadingCep(false);
  }

  async function handleSubmit(formData: FormData) {
    formData.set('personType', personType);
    formData.set('address', address);
    await completeProfileAction(formData);
    setSuccess(true);
    setTimeout(() => onClose(), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Completar cadastro</h2>
            <p className="text-sm text-gray-500 mt-0.5">Necessário para saques e conformidade</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle size={48} className="text-green-500" />
            <p className="text-gray-700 font-medium">Cadastro completado!</p>
          </div>
        ) : (
          <form action={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Tipo de pessoa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pessoa</label>
              <div className="grid grid-cols-2 gap-3">
                {(['PF', 'PJ'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPersonType(type)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      personType === type
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {type === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                  </button>
                ))}
              </div>
            </div>

            {/* Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {personType === 'PF' ? 'CPF' : 'CNPJ'}
              </label>
              <input
                name="document"
                required
                placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Data de nascimento — apenas PF */}
            {personType === 'PF' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de nascimento</label>
                <input
                  name="birthDate"
                  type="date"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            )}

            {/* CEP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CEP</label>
              <div className="relative">
                <input
                  name="zipCode"
                  required
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    fetchAddress(e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pr-10"
                />
                {loadingCep && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />
                )}
              </div>
            </div>

            {/* Endereço (preenchido automaticamente) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereço</label>
              <input
                name="address"
                required
                placeholder="Preenchido automaticamente pelo CEP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm"
            >
              Salvar e continuar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
