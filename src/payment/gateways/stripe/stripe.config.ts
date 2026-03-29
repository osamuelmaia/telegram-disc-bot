export interface StripeConfig {
  secretKey: string;
  /** Webhook endpoint secret — gerado no painel Stripe ou via CLI `stripe listen` */
  webhookSecret: string;
  /** API version fixada para evitar breaking changes silenciosos */
  apiVersion: '2025-02-24.acacia';
}

export const stripeConfigFromEnv = (): StripeConfig => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  apiVersion: '2025-02-24.acacia',
});
