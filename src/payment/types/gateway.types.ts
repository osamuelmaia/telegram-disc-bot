import { PaymentGateway } from '@prisma/client';

// ── Tokens DI ─────────────────────────────────────────────────────────────────

export const EFI_GATEWAY = Symbol('EFI_GATEWAY');
export const STRIPE_GATEWAY = Symbol('STRIPE_GATEWAY');

// ── Mapeamento produto → gateway ──────────────────────────────────────────────

/** Mapeia o enum do Prisma para o token DI do gateway correspondente. */
export const GATEWAY_TOKEN_MAP: Record<PaymentGateway, symbol> = {
  [PaymentGateway.EFI]: EFI_GATEWAY,
  [PaymentGateway.STRIPE]: STRIPE_GATEWAY,
  [PaymentGateway.MERCADO_PAGO]: EFI_GATEWAY,   // fallback — trocar quando implementado
  [PaymentGateway.ASAAS]: EFI_GATEWAY,          // fallback — trocar quando implementado
};

// ── DTOs internos do PaymentService ──────────────────────────────────────────

export interface ProcessPixChargeParams {
  userId: string;
  productId: string;
  telegramId: bigint;
  gatewayType: PaymentGateway;
}

export interface ProcessSubscriptionParams {
  userId: string;
  productId: string;
  telegramId: bigint;
  gatewayType: PaymentGateway;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
}

// ── Resultado retornado pelo PaymentService para o CheckoutService ─────────────

export interface PixChargeServiceResult {
  orderId: string;
  pixCopyPaste: string;
  pixQrCodeBase64: string | null;
  pixQrCodeUrl: string | null;
  expiresAt: Date;
}

export interface SubscriptionServiceResult {
  subscriptionId: string;
  checkoutUrl: string;
}
