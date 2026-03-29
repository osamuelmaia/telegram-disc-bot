// =============================================================================
// Eventos de pagamento — emitidos pelo PaymentService via EventEmitter2
// =============================================================================
// O BotEventsService escuta estes eventos para notificar o usuário no Telegram
// e executar operações de acesso (grant/revoke) de forma desacoplada.
// =============================================================================

export const PAYMENT_EVENTS = {
  PIX_CONFIRMED: 'payment.pix.confirmed',
  SUBSCRIPTION_ACTIVATED: 'payment.subscription.activated',
  SUBSCRIPTION_CANCELLED: 'payment.subscription.cancelled',
  SUBSCRIPTION_PAST_DUE: 'payment.subscription.past_due',
  INVOICE_PAID: 'payment.invoice.paid',
  INVOICE_FAILED: 'payment.invoice.failed',
} as const;

export type PaymentEventKey = (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

// ── Payloads dos eventos ──────────────────────────────────────────────────────

export interface PixConfirmedEvent {
  orderId: string;
  userId: string;
  telegramId: bigint;
  productId: string;
  productName: string;
  /** chatId do Telegram para o qual o acesso deve ser liberado */
  chatId: string;
  accessId: string;
  amount: number;
}

export interface SubscriptionActivatedEvent {
  subscriptionId: string;
  userId: string;
  telegramId: bigint;
  productId: string;
  productName: string;
  chatId: string;
  accessId: string;
}

export interface SubscriptionCancelledEvent {
  subscriptionId: string;
  userId: string;
  telegramId: bigint;
  productId: string;
  productName: string;
}

export interface SubscriptionPastDueEvent {
  subscriptionId: string;
  userId: string;
  telegramId: bigint;
  productId: string;
  productName: string;
}

export interface InvoicePaidEvent {
  subscriptionId: string;
  userId: string;
  telegramId: bigint;
  gatewayInvoiceId: string;
  amount: number;
}

export interface InvoiceFailedEvent {
  subscriptionId: string;
  userId: string;
  telegramId: bigint;
  productId: string;
  productName: string;
}
