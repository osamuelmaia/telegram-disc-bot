import { Logger, UnauthorizedException } from '@nestjs/common';
import Stripe from 'stripe';
import {
  CancelSubscriptionInput,
  CreatePixChargeInput,
  CreateSubscriptionInput,
  IPaymentGateway,
  NormalizedSubscriptionStatus,
  ParsedWebhookEvent,
  PixChargeOutput,
  PixChargeStatusOutput,
  SubscriptionOutput,
  SubscriptionStatusOutput,
} from '../../interfaces/payment-gateway.interface';
import { StripeConfig } from './stripe.config';
import { RELEVANT_STRIPE_EVENTS, StripeSubscriptionStatus } from './stripe.types';

// =============================================================================
// StripeGateway — Implementação de assinatura recorrente via Stripe
// =============================================================================
// Suporta: Checkout Session, consulta de subscription, cancelamento e webhook.
// NÃO suporta Pix (use EfiGateway).
//
// Fluxo de assinatura:
//   1. createSubscription() → cria Checkout Session → retorna URL externa
//   2. Usuário paga no Stripe Checkout (fora do bot)
//   3. Stripe envia webhook checkout.session.completed
//   4. parseWebhookEvent() normaliza o evento → PaymentService processa
// =============================================================================

export class StripeGateway implements IPaymentGateway {
  readonly gatewayName = 'stripe';

  private readonly logger = new Logger(StripeGateway.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion,
      typescript: true,
    });

    this.webhookSecret = config.webhookSecret;
  }

  // ── Pix (não suportado — use EfiGateway) ─────────────────────────────────

  createPixCharge(_input: CreatePixChargeInput): Promise<PixChargeOutput> {
    throw new Error('StripeGateway does not support Pix. Use EfiGateway.');
  }

  getPixChargeStatus(_txid: string): Promise<PixChargeStatusOutput> {
    throw new Error('StripeGateway does not support Pix. Use EfiGateway.');
  }

  cancelPixCharge(_txid: string): Promise<void> {
    throw new Error('StripeGateway does not support Pix. Use EfiGateway.');
  }

  // ── Assinatura ────────────────────────────────────────────────────────────

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionOutput> {
    // Cria ou reutiliza o customer no Stripe
    const customerId = input.existingCustomerId ?? (await this.createCustomer(input.metadata));

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      subscription_data: {
        trial_period_days: input.trialDays,
        metadata: input.metadata ?? {},
      },
      metadata: input.metadata ?? {},
      // Permite que o cliente gerencie o método de pagamento
      payment_method_collection: 'always',
    });

    return {
      // A subscription ainda não existe — é criada pelo Stripe após o checkout
      gatewaySubscriptionId: null,
      gatewayCustomerId: customerId,
      checkoutUrl: session.url!,
      checkoutSessionId: session.id,
    };
  }

  async getSubscriptionStatus(gatewaySubscriptionId: string): Promise<SubscriptionStatusOutput> {
    const subscription = await this.stripe.subscriptions.retrieve(gatewaySubscriptionId);

    return {
      gatewaySubscriptionId: subscription.id,
      status: this.mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<void> {
    if (input.immediately) {
      await this.stripe.subscriptions.cancel(input.gatewaySubscriptionId);
    } else {
      await this.stripe.subscriptions.update(input.gatewaySubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  parseWebhookEvent(rawBody: Buffer | string, headers: Record<string, string>): ParsedWebhookEvent {
    const signature = headers['stripe-signature'];

    if (!signature) {
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // stripe.webhooks.constructEvent verifica a assinatura HMAC-SHA256
      // rawBody DEVE ser o corpo bruto (Buffer), não parseado
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      throw new UnauthorizedException(`Invalid Stripe webhook signature: ${err}`);
    }

    return this.normalizeStripeEvent(event);
  }

  // ── Helpers privados ─────────────────────────────────────────────────────

  private async createCustomer(metadata?: Record<string, string>): Promise<string> {
    const customer = await this.stripe.customers.create({ metadata });
    return customer.id;
  }

  private normalizeStripeEvent(event: Stripe.Event): ParsedWebhookEvent {
    const eventId = event.id;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== 'subscription') {
          return { eventId, eventType: 'unknown', data: { type: 'unknown' } };
        }

        const subscriptionId = session.subscription as string;
        // A subscription pode não estar disponível ainda; o PaymentService
        // vai buscar pelo checkoutSessionId para encontrar o registro.
        return {
          eventId,
          eventType: 'subscription.activated',
          data: {
            type: 'subscription.activated',
            gatewaySubscriptionId: subscriptionId,
            gatewayCustomerId: session.customer as string,
            checkoutSessionId: session.id,
            // Períodos serão buscados em customer.subscription.created
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
            trialEnd: null,
          },
        };
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;

        const status = this.mapSubscriptionStatus(sub.status);

        if (status === 'past_due') {
          return {
            eventId,
            eventType: 'subscription.past_due',
            data: {
              type: 'subscription.past_due',
              gatewaySubscriptionId: sub.id,
            },
          };
        }

        if (status === 'cancelled') {
          return {
            eventId,
            eventType: 'subscription.cancelled',
            data: {
              type: 'subscription.cancelled',
              gatewaySubscriptionId: sub.id,
              cancelledAt: new Date(),
            },
          };
        }

        return {
          eventId,
          eventType: 'subscription.updated',
          data: {
            type: 'subscription.updated',
            gatewaySubscriptionId: sub.id,
            status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        };
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        return {
          eventId,
          eventType: 'subscription.cancelled',
          data: {
            type: 'subscription.cancelled',
            gatewaySubscriptionId: sub.id,
            cancelledAt: new Date((sub.canceled_at ?? sub.current_period_end) * 1000),
          },
        };
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const paymentIntent = invoice.payment_intent as string | null;

        return {
          eventId,
          eventType: 'invoice.paid',
          data: {
            type: 'invoice.paid',
            gatewaySubscriptionId: invoice.subscription as string,
            gatewayInvoiceId: invoice.id,
            gatewayPaymentId: paymentIntent ?? '',
            amount: invoice.amount_paid / 100, // Stripe usa centavos
            paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
          },
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        return {
          eventId,
          eventType: 'invoice.failed',
          data: {
            type: 'invoice.failed',
            gatewaySubscriptionId: invoice.subscription as string,
            gatewayInvoiceId: invoice.id,
            failedAt: new Date(),
          },
        };
      }

      default:
        return { eventId, eventType: 'unknown', data: { type: 'unknown' } };
    }
  }

  private mapSubscriptionStatus(status: StripeSubscriptionStatus): NormalizedSubscriptionStatus {
    const map: Record<StripeSubscriptionStatus, NormalizedSubscriptionStatus> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'cancelled',
      paused: 'past_due',
    };
    return map[status] ?? 'incomplete';
  }
}
