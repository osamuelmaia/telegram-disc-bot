// =============================================================================
// API client — todas as chamadas são server-side (chave nunca vai ao browser)
// =============================================================================

import type {
  Access,
  Customer,
  DashboardStats,
  Order,
  PaginatedResult,
  Product,
  Subscription,
  WebhookEvent,
} from './types';

const BASE_URL = process.env.ADMIN_API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.ADMIN_API_KEY ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': API_KEY,
      ...(init?.headers ?? {}),
    },
    // Sem cache no admin — sempre dados frescos
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${path}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  apiFetch<DashboardStats>('/admin/dashboard/stats');

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Order>>(`/admin/orders${qs ? `?${qs}` : ''}`);
};

export const getOrderById = (id: string) =>
  apiFetch<Order>(`/admin/orders/${id}`);

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const getSubscriptions = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Subscription>>(`/admin/subscriptions${qs ? `?${qs}` : ''}`);
};

export const cancelSubscription = (id: string, immediately: boolean) =>
  apiFetch<void>(`/admin/subscriptions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ immediately }),
  });

// ── Customers ─────────────────────────────────────────────────────────────────

export const getCustomers = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Customer>>(`/admin/customers${qs ? `?${qs}` : ''}`);
};

export const getCustomerById = (id: string) =>
  apiFetch<Customer>(`/admin/customers/${id}`);

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Product>>(`/admin/products${qs ? `?${qs}` : ''}`);
};

export const createProduct = (body: Partial<Product>) =>
  apiFetch<Product>('/admin/products', { method: 'POST', body: JSON.stringify(body) });

export const updateProduct = (id: string, body: Partial<Product>) =>
  apiFetch<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const deleteProduct = (id: string) =>
  apiFetch<Product>(`/admin/products/${id}`, { method: 'DELETE' });

// ── Accesses ──────────────────────────────────────────────────────────────────

export const getAccesses = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Access>>(`/admin/accesses${qs ? `?${qs}` : ''}`);
};

export const grantAccess = (body: {
  userId: string;
  productId: string;
  chatId: string;
  expiresAt?: string;
}) => apiFetch<Access>('/admin/accesses/grant', { method: 'POST', body: JSON.stringify(body) });

export const revokeAccess = (id: string, reason: string) =>
  apiFetch<Access>(`/admin/accesses/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const getFailedWebhooks = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<WebhookEvent>>(`/admin/webhooks/failed${qs ? `?${qs}` : ''}`);
};

export const retryWebhook = (id: string) =>
  apiFetch<void>(`/admin/webhooks/${id}/retry`, { method: 'POST' });
