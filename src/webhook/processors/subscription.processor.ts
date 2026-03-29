import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessStatus, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InvoiceFailedData,
  InvoicePaidData,
  ParsedWebhookEvent,
  SubscriptionActivatedData,
  SubscriptionCancelledData,
  SubscriptionPastDueData,
  SubscriptionUpdatedData,
  WebhookEventType,
} from '../../payment/interfaces/payment-gateway.interface';
import {
  PAYMENT_EVENTS,
  InvoiceFailedEvent,
  InvoicePaidEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPastDueEvent,
} from '../../payment/payment.events';
import { IWebhookProcessor } from './webhook-processor.interface';

@Injectable()
export class SubscriptionWebhookProcessor implements IWebhookProcessor {
  readonly supportedEvents: ReadonlyArray<WebhookEventType> = [
    'subscription.activated',
    'subscription.updated',
    'subscription.cancelled',
    'subscription.past_due',
    'invoice.paid',
    'invoice.failed',
  ];

  private readonly logger = new Logger(SubscriptionWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  canHandle(eventType: WebhookEventType): boolean {
    return this.supportedEvents.includes(eventType);
  }

  async handle(event: ParsedWebhookEvent, webhookEventId: string): Promise<void> {
    this.logger.log(`[wh:${webhookEventId}] Processing ${event.eventType}`);

    switch (event.eventType) {
      case 'subscription.activated':
        return this.handleActivated(event.data as SubscriptionActivatedData, webhookEventId);
      case 'subscription.updated':
        return this.handleUpdated(event.data as SubscriptionUpdatedData, webhookEventId);
      case 'subscription.cancelled':
        return this.handleCancelled(event.data as SubscriptionCancelledData, webhookEventId);
      case 'subscription.past_due':
        return this.handlePastDue(event.data as SubscriptionPastDueData, webhookEventId);
      case 'invoice.paid':
        return this.handleInvoicePaid(event.data as InvoicePaidData, webhookEventId);
      case 'invoice.failed':
        return this.handleInvoiceFailed(event.data as InvoiceFailedData, webhookEventId);
    }
  }

  // ── Assinatura ativada ────────────────────────────────────────────────────

  private async handleActivated(data: SubscriptionActivatedData, wh: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          ...(data.checkoutSessionId ? [{ checkoutSessionId: data.checkoutSessionId }] : []),
          { gatewaySubscriptionId: data.gatewaySubscriptionId },
        ],
      },
      include: {
        user: { select: { id: true, telegramId: true } },
        product: { select: { id: true, name: true, chatId: true } },
      },
    });

    if (!subscription) {
      this.logger.warn(
        `[wh:${wh}] No subscription found for checkout=${data.checkoutSessionId} / sub=${data.gatewaySubscriptionId}`,
      );
      return;
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      this.logger.debug(`[wh:${wh}] Subscription ${subscription.id} already ACTIVE — idempotent skip`);
      return;
    }

    if (!subscription.product.chatId) {
      this.logger.error(`[wh:${wh}] Product ${subscription.productId} has no chatId`);
    }

    const access = await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          gatewaySubscriptionId: data.gatewaySubscriptionId,
          gatewayCustomerId: data.gatewayCustomerId,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          trialEndsAt: data.trialEnd,
        },
      });

      const existing = await tx.access.findUnique({ where: { subscriptionId: subscription.id } });
      if (existing) return existing;

      return tx.access.create({
        data: {
          userId: subscription.userId,
          productId: subscription.productId,
          chatId: subscription.product.chatId ?? '',
          status: AccessStatus.ACTIVE,
          subscriptionId: subscription.id,
        },
      });
    });

    this.logger.log(
      `[wh:${wh}] Subscription ${subscription.id} ACTIVE — access=${access.id} granted`,
    );

    const payload: SubscriptionActivatedEvent = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
      chatId: subscription.product.chatId ?? '',
      accessId: access.id,
    };

    this.events.emit(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED, payload);
  }

  // ── Assinatura atualizada ─────────────────────────────────────────────────

  private async handleUpdated(data: SubscriptionUpdatedData, wh: string): Promise<void> {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      cancelled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.UNPAID,
      incomplete: SubscriptionStatus.PENDING,
    };

    const updated = await this.prisma.subscription.updateMany({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      data: {
        status: statusMap[data.status] ?? SubscriptionStatus.PAST_DUE,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });

    this.logger.log(
      `[wh:${wh}] Subscription ${data.gatewaySubscriptionId} updated to ${data.status} — affected=${updated.count}`,
    );
  }

  // ── Assinatura cancelada ──────────────────────────────────────────────────

  private async handleCancelled(data: SubscriptionCancelledData, wh: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: {
        user: { select: { id: true, telegramId: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!subscription) {
      this.logger.warn(
        `[wh:${wh}] No subscription found for gatewayId=${data.gatewaySubscriptionId}`,
      );
      return;
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      this.logger.debug(`[wh:${wh}] Subscription ${subscription.id} already CANCELLED — skip`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: data.cancelledAt,
        },
      });

      await tx.access.updateMany({
        where: { subscriptionId: subscription.id, status: AccessStatus.ACTIVE },
        data: {
          status: AccessStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: 'subscription_cancelled',
        },
      });
    });

    this.logger.log(
      `[wh:${wh}] Subscription ${subscription.id} CANCELLED — access revoked`,
    );

    const payload: SubscriptionCancelledEvent = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    };

    this.events.emit(PAYMENT_EVENTS.SUBSCRIPTION_CANCELLED, payload);
  }

  // ── Pagamento em atraso ───────────────────────────────────────────────────

  private async handlePastDue(data: SubscriptionPastDueData, wh: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: {
        user: { select: { id: true, telegramId: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.logger.log(`[wh:${wh}] Subscription ${subscription.id} marked PAST_DUE`);

    const payload: SubscriptionPastDueEvent = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    };

    this.events.emit(PAYMENT_EVENTS.SUBSCRIPTION_PAST_DUE, payload);
  }

  // ── Fatura paga ───────────────────────────────────────────────────────────

  private async handleInvoicePaid(data: InvoicePaidData, wh: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: { user: { select: { id: true, telegramId: true } } },
    });

    if (!subscription) return;

    // Verifica idempotência na camada de negócio: evita fatura duplicada
    const existingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { gatewayInvoiceId: data.gatewayInvoiceId },
    });

    if (existingPayment) {
      this.logger.debug(`[wh:${wh}] Invoice ${data.gatewayInvoiceId} already recorded — skip`);
      return;
    }

    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        gatewayInvoiceId: data.gatewayInvoiceId,
        gatewayPaymentId: data.gatewayPaymentId,
        amount: data.amount,
        currency: 'BRL',
        status: PaymentStatus.PAID,
        paidAt: data.paidAt,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });

    this.logger.log(
      `[wh:${wh}] Invoice ${data.gatewayInvoiceId} recorded — amount=${data.amount} sub=${subscription.id}`,
    );

    const payload: InvoicePaidEvent = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      gatewayInvoiceId: data.gatewayInvoiceId,
      amount: data.amount,
    };

    this.events.emit(PAYMENT_EVENTS.INVOICE_PAID, payload);
  }

  // ── Fatura falhou ─────────────────────────────────────────────────────────

  private async handleInvoiceFailed(data: InvoiceFailedData, wh: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: {
        user: { select: { id: true, telegramId: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!subscription) return;

    const existingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { gatewayInvoiceId: data.gatewayInvoiceId, status: PaymentStatus.FAILED },
    });

    if (!existingPayment) {
      await this.prisma.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          gatewayInvoiceId: data.gatewayInvoiceId,
          amount: 0,
          currency: 'BRL',
          status: PaymentStatus.FAILED,
          failedAt: data.failedAt,
        },
      });
    }

    this.logger.warn(
      `[wh:${wh}] Invoice ${data.gatewayInvoiceId} FAILED — sub=${subscription.id}`,
    );

    const payload: InvoiceFailedEvent = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    };

    this.events.emit(PAYMENT_EVENTS.INVOICE_FAILED, payload);
  }
}
