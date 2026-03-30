// =============================================================================
// IPaymentGateway — Contrato único para todos os gateways de pagamento
// =============================================================================
// Cada gateway (Efí, Stripe, Asaas...) implementa esta interface.
// O PaymentService depende apenas deste contrato — nunca do gateway diretamente.
// =============================================================================

// ── Pix ───────────────────────────────────────────────────────────────────────

export interface CreatePixChargeInput {
  /** Identificador único da transação. Gerado pelo gateway se omitido. */
  txid?: string;
  /** Valor em reais, ex: 99.90 */
  amount: number;
  description: string;
  /** Tempo de validade em segundos. Padrão: 3600 (1 hora) */
  expiresInSeconds?: number;
  debtor?: {
    name: string;
    /** Somente dígitos */
    cpf: string;
  };
}

export interface PixChargeOutput {
  txid: string;
  gatewayOrderId: string;
  /** Código EMV copia-e-cola */
  pixCopyPaste: string;
  /** PNG do QR Code em base64 (null se não disponível na criação) */
  pixQrCodeBase64: string | null;
  /** URL pública da imagem do QR Code */
  pixQrCodeUrl: string | null;
  expiresAt: Date;
  status: PixChargeStatus;
}

export type PixChargeStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REMOVED_BY_RECEIVER'
  | 'REMOVED_BY_PSP';

export interface PixChargeStatusOutput {
  txid: string;
  status: PixChargeStatus;
  paidAt: Date | null;
  /** E2E ID gerado pelo banco pagador — usado para conciliação */
  endToEndId: string | null;
  amount: number;
}

// ── Assinatura ────────────────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  /** ID do customer já existente no gateway. Criado automaticamente se omitido. */
  existingCustomerId?: string;
  /** ID do preço/plano configurado no painel do gateway */
  priceId: string;
  trialDays?: number;
  /** URL para onde o gateway redireciona após o checkout bem-sucedido */
  successUrl: string;
  /** URL para onde o gateway redireciona se o usuário cancelar o checkout */
  cancelUrl: string;
  /** Metadados livres enviados ao gateway (ex: { telegramId, userId }) */
  metadata?: Record<string, string>;
}

export interface SubscriptionOutput {
  /** null enquanto o checkout ainda não foi completado */
  gatewaySubscriptionId: string | null;
  gatewayCustomerId: string;
  /** Link externo do checkout (ex: Stripe Checkout Session URL) */
  checkoutUrl: string;
  checkoutSessionId: string;
}

export interface SubscriptionStatusOutput {
  gatewaySubscriptionId: string;
  status: NormalizedSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

export type NormalizedSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'unpaid'
  | 'incomplete';

export interface CancelSubscriptionInput {
  gatewaySubscriptionId: string;
  /** true = cancela imediatamente; false = cancela ao fim do período atual */
  immediately: boolean;
}

// ── Webhook ───────────────────────────────────────────────────────────────────

/**
 * Resultado da verificação e parsing do payload de webhook.
 * O gateway verifica a assinatura e normaliza o evento para este formato.
 */
export interface ParsedWebhookEvent {
  /** ID único do evento no gateway — usado para idempotência */
  eventId: string;
  /** Tipo do evento normalizado (ex: 'pix.paid', 'subscription.activated') */
  eventType: WebhookEventType;
  data: WebhookEventData;
}

export type WebhookEventType =
  | 'pix.paid'
  | 'subscription.activated'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.past_due'
  | 'invoice.paid'
  | 'invoice.failed'
  | 'unknown';

export type WebhookEventData =
  | PixPaidData
  | SubscriptionActivatedData
  | SubscriptionUpdatedData
  | SubscriptionCancelledData
  | SubscriptionPastDueData
  | InvoicePaidData
  | InvoiceFailedData
  | UnknownEventData;

export interface PixPaidData {
  type: 'pix.paid';
  txid: string;
  endToEndId: string;
  amount: number;
  paidAt: Date;
}

export interface SubscriptionActivatedData {
  type: 'subscription.activated';
  gatewaySubscriptionId: string;
  gatewayCustomerId: string;
  checkoutSessionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd: Date | null;
}

export interface SubscriptionUpdatedData {
  type: 'subscription.updated';
  gatewaySubscriptionId: string;
  status: NormalizedSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionCancelledData {
  type: 'subscription.cancelled';
  gatewaySubscriptionId: string;
  cancelledAt: Date;
}

export interface SubscriptionPastDueData {
  type: 'subscription.past_due';
  gatewaySubscriptionId: string;
}

export interface InvoicePaidData {
  type: 'invoice.paid';
  gatewaySubscriptionId: string;
  gatewayInvoiceId: string;
  gatewayPaymentId: string;
  amount: number;
  paidAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export interface InvoiceFailedData {
  type: 'invoice.failed';
  gatewaySubscriptionId: string;
  gatewayInvoiceId: string;
  failedAt: Date;
}

export interface UnknownEventData {
  type: 'unknown';
}

// ── Interface principal ───────────────────────────────────────────────────────

export interface IPaymentGateway {
  /** Identificador único do gateway (ex: 'efi', 'stripe') */
  readonly gatewayName: string;

  // Pix
  createPixCharge(input: CreatePixChargeInput): Promise<PixChargeOutput>;
  getPixChargeStatus(txid: string): Promise<PixChargeStatusOutput>;
  cancelPixCharge(txid: string): Promise<void>;

  // Assinatura
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionOutput>;
  getSubscriptionStatus(gatewaySubscriptionId: string): Promise<SubscriptionStatusOutput>;
  cancelSubscription(input: CancelSubscriptionInput): Promise<void>;

  /**
   * Verifica a assinatura/autenticidade do webhook e normaliza o payload.
   * Lança exceção se a assinatura for inválida.
   * @param rawBody Buffer do corpo bruto (necessário para verificação de assinatura)
   * @param headers Headers HTTP da requisição
   */
  parseWebhookEvent(
    rawBody: Buffer | string,
    headers: Record<string, string>,
  ): ParsedWebhookEvent[];
}
