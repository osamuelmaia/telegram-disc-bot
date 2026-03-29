// =============================================================================
// Tipos auxiliares do Stripe usados internamente pelo StripeGateway
// A tipagem oficial vem do pacote 'stripe' — estes são apenas aliases internos.
// =============================================================================

import Stripe from 'stripe';

/** Status da subscription Stripe mapeado para o domínio interno */
export type StripeSubscriptionStatus = Stripe.Subscription.Status;

/** Eventos do Stripe relevantes para o domínio de pagamentos */
export type RelevantStripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

export const RELEVANT_STRIPE_EVENTS: RelevantStripeEventType[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];
