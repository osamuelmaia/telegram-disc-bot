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
};
