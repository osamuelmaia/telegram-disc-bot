// =============================================================================
// Tipos compartilhados entre as páginas do admin panel
// Espelham o retorno da API NestJS
// =============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DashboardStats {
  revenue: { today: number; thisMonth: number; total: number };
  orders: { total: number; paid: number; pending: number; failed: number };
  subscriptions: { active: number; trialing: number; pastDue: number; cancelled: number };
  customers: { total: number; newToday: number; newThisMonth: number };
  accesses: { active: number; revoked: number };
  webhooks: { failed: number };
}

export interface Order {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  gateway: string;
  amount: string;
  currency: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
  user?: { telegramId: string; username?: string; firstName?: string };
  product?: { name: string };
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'PENDING' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELLED' | 'EXPIRED';
  gateway: string;
  gatewaySubscriptionId?: string;
  checkoutUrl?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  createdAt: string;
  user?: { telegramId: string; username?: string; firstName?: string };
  product?: { name: string; price: string };
}

export interface Customer {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  _count?: { orders: number; subscriptions: number; accesses: number };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: 'ONE_TIME' | 'RECURRING';
  price: string;
  currency: string;
  billingInterval?: string;
  trialDays?: number;
  chatId?: string;
  active: boolean;
  createdAt: string;
  _count?: { orders: number; subscriptions: number; accesses: number };
}

export interface Access {
  id: string;
  userId: string;
  productId: string;
  chatId: string;
  status: 'ACTIVE' | 'REVOKED';
  inviteLink?: string;
  grantedAt: string;
  revokedAt?: string;
  revokedReason?: string;
  expiresAt?: string;
  user?: { telegramId: string; username?: string; firstName?: string };
  product?: { name: string };
}

export interface WebhookEvent {
  id: string;
  gateway: string;
  eventId: string;
  eventType: string;
  status: string;
  attempts: number;
  error?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Tenant {
  id: string;
  email: string;
  name?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  _count?: { orders: number; subscriptions: number };
}

export interface WithdrawalRequest {
  id: string;
  tenantId: string;
  amount: string;
  pixKeyType?: string;
  pixKeyValue?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectedReason?: string;
  processedAt?: string;
  createdAt: string;
  tenant?: { email: string; name?: string };
}

export interface PlatformConfig {
  feePercent: number;
  minWithdrawalAmount: number;
  withdrawalPaymentDays: number;
}
