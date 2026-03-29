// =============================================================================
// API client — todas as chamadas são server-side (chave nunca vai ao browser)
// =============================================================================

import type {
  Access,
  Customer,
  DashboardStats,
  Order,
  PaginatedResult,
  PlatformConfig,
  Product,
  Subscription,
  Tenant,
  WebhookEvent,
  WithdrawalRequest,
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
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
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

export const createProduct = (body: Record<string, unknown>) =>
  apiFetch<Product>('/admin/products', { method: 'POST', body: JSON.stringify(body) });

export const updateProduct = (id: string, body: Record<string, unknown>) =>
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

// ── Tenants ───────────────────────────────────────────────────────────────────

export const getTenants = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<Tenant>>(`/admin/tenants${qs ? `?${qs}` : ''}`);
};

export const getTenantById = (id: string) =>
  apiFetch<Tenant>(`/admin/tenants/${id}`);

export const suspendTenant = (id: string) =>
  apiFetch<void>(`/admin/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'SUSPENDED' }) });

export const activateTenant = (id: string) =>
  apiFetch<void>(`/admin/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) });

export const updateTenantSettings = (id: string, body: { feePercent?: number; cardReleaseDays?: number }) =>
  apiFetch<void>(`/admin/tenants/${id}/settings`, { method: 'PATCH', body: JSON.stringify(body) });

// ── Withdrawals ───────────────────────────────────────────────────────────────

export const getAdminWithdrawals = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResult<WithdrawalRequest>>(`/admin/withdrawals${qs ? `?${qs}` : ''}`);
};

export const approveWithdrawal = (id: string) =>
  apiFetch<void>(`/admin/withdrawals/${id}/approve`, { method: 'POST' });

export const rejectWithdrawal = (id: string, reason: string) =>
  apiFetch<void>(`/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ── Platform Config ───────────────────────────────────────────────────────────

export const getPlatformConfig = () =>
  apiFetch<PlatformConfig>('/admin/config');

export const updatePlatformConfig = (body: Partial<PlatformConfig>) =>
  apiFetch<PlatformConfig>('/admin/config', { method: 'PATCH', body: JSON.stringify(body) });
