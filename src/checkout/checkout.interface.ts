// =============================================================================
// Checkout Service — Contrato de abstração de gateways
// =============================================================================
// Implementações concretas ficam no módulo de payment (Efí, Stripe etc.).
// O bot depende apenas desta interface — nunca do gateway diretamente.
// =============================================================================

export interface PixChargeResult {
  orderId: string;
  pixCopyPaste: string;
  pixQrCodeBase64: string | null; // base64 do PNG do QR Code
  pixQrCodeUrl: string | null;    // URL alternativa para a imagem
  expiresAt: Date;
}

export interface CardCheckoutResult {
  subscriptionId: string;
  checkoutUrl: string; // link externo do Stripe Checkout (ou equivalente)
}

/**
 * Token de injeção + contrato do serviço de checkout.
 * Usar abstract class para funcionar como token DI no NestJS.
 */
export abstract class CheckoutService {
  abstract createPixCharge(
    telegramId: bigint,
    productId: string,
  ): Promise<PixChargeResult>;

  abstract createCardCheckout(
    telegramId: bigint,
    productId: string,
  ): Promise<CardCheckoutResult>;
}
