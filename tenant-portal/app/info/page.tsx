import { getProfile } from '@/lib/api';
import { updateProfileAction } from '@/lib/actions';
import { User, Key, MapPin } from 'lucide-react';

export default async function InfoPage() {
  const profile = await getProfile().catch(() => ({} as Record<string, unknown>));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie suas informações pessoais e preferências.</p>
      </div>

      {/* Dados gerais */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-indigo-600" />
          <h2 className="text-base font-semibold text-gray-900">Dados da conta</h2>
        </div>
        <form action={updateProfileAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
              <input
                name="name"
                defaultValue={(profile.name as string) ?? ''}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                value={(profile.email as string) ?? ''}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          >
            Salvar
          </button>
        </form>
      </div>

      {/* Chave Pix */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key size={18} className="text-indigo-600" />
          <h2 className="text-base font-semibold text-gray-900">Chave Pix para saques</h2>
        </div>
        <form action={updateProfileAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de chave</label>
              <select
                name="pixKeyType"
                defaultValue={(profile.pixKeyType as string) ?? ''}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="">Selecione</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Aleatória</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Chave Pix</label>
              <input
                name="pixKeyValue"
                defaultValue={(profile.pixKeyValue as string) ?? ''}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          >
            Salvar chave Pix
          </button>
        </form>
      </div>

      {/* Dados cadastrais */}
      {!!(profile.document || profile.zipCode) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Dados cadastrais</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tipo</p>
              <p className="font-medium text-gray-900 mt-0.5">{profile.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
            </div>
            <div>
              <p className="text-gray-500">{profile.personType === 'PF' ? 'CPF' : 'CNPJ'}</p>
              <p className="font-medium text-gray-900 mt-0.5">{profile.document as string}</p>
            </div>
            {!!profile.birthDate && (
              <div>
                <p className="text-gray-500">Data de nascimento</p>
                <p className="font-medium text-gray-900 mt-0.5">{profile.birthDate as string}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">CEP</p>
              <p className="font-medium text-gray-900 mt-0.5">{profile.zipCode as string}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Endereço</p>
              <p className="font-medium text-gray-900 mt-0.5">{profile.address as string}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
