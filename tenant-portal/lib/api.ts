// =============================================================================
// API client — server-side, usa JWT do cookie
// =============================================================================

import { cookies } from 'next/headers';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = cookies().get('token')?.value ?? '';
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${path}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// (usado apenas em actions.ts com fetch direto, sem cookie ainda)

export const API_BASE = BASE_URL;

// ── Perfil ────────────────────────────────────────────────────────────────────

export const getProfile = () => apiFetch<Record<string, unknown>>('/dashboard/me');

// ── Bot ───────────────────────────────────────────────────────────────────────

export const getBot = () => apiFetch<Record<string, unknown>>('/dashboard/bot');

// ── Gateways ──────────────────────────────────────────────────────────────────

export const getGateways = () => apiFetch<Record<string, unknown>[]>('/dashboard/gateways');

// ── Produtos ──────────────────────────────────────────────────────────────────

export const getProducts = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Record<string, unknown>>(`/dashboard/products${qs ? `?${qs}` : ''}`);
};

// ── Pedidos ───────────────────────────────────────────────────────────────────

export const getOrders = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Record<string, unknown>>(`/dashboard/orders${qs ? `?${qs}` : ''}`);
};

// ── Assinaturas ───────────────────────────────────────────────────────────────

export const getSubscriptions = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Record<string, unknown>>(`/dashboard/subscriptions${qs ? `?${qs}` : ''}`);
};

// ── Carteira ──────────────────────────────────────────────────────────────────

export const getWallet = () => apiFetch<Record<string, unknown>>('/dashboard/wallet');

export const getWalletTransactions = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Record<string, unknown>>(`/dashboard/wallet/transactions${qs ? `?${qs}` : ''}`);
};

// ── Saques ────────────────────────────────────────────────────────────────────

export const getWithdrawals = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Record<string, unknown>>(`/dashboard/withdrawals${qs ? `?${qs}` : ''}`);
};
