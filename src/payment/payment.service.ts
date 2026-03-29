import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessStatus, OrderStatus, PaymentGateway, ProductType, SubscriptionStatus, WebhookStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePixChargeDto } from './dto/create-pix-charge.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { IPaymentGateway, ParsedWebhookEvent, PixPaidData, SubscriptionActivatedData, SubscriptionCancelledData, SubscriptionPastDueData, InvoicePaidData, InvoiceFailedData, SubscriptionUpdatedData } from './interfaces/payment-gateway.interface';
import { PAYMENT_EVENTS } from './payment.events';
import { EFI_GATEWAY, STRIPE_GATEWAY, PixChargeServiceResult, SubscriptionServiceResult } from './types/gateway.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(EFI_GATEWAY) private readonly efiGateway: IPaymentGateway,
    @Inject(STRIPE_GATEWAY) private readonly stripeGateway: IPaymentGateway,
  ) {}

  // ── Criação de cobrança Pix ──────────────────────────────────────────────

  async createPixCharge(dto: CreatePixChargeDto): Promise<PixChargeServiceResult> {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const amount = dto.amount ?? Number(product.price.toString());

    // 1. Cria o registro do pedido antes de chamar o gateway (fail-safe)
    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        status: OrderStatus.PENDING,
        gateway: PaymentGateway.EFI,
        amount,
        currency: product.currency,
      },
    });

    try {
      const result = await this.efiGateway.createPixCharge({
        amount,
        description: product.name,
        expiresInSeconds: dto.expiresInSeconds ?? 3600,
        debtor: dto.debtor,
      });

      // 2. Atualiza o pedido com os dados do gateway
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayOrderId: result.gatewayOrderId,
          gatewayTxid: result.txid,
          pixCopyPaste: result.pixCopyPaste,
          pixQrCodeBase64: result.pixQrCodeBase64,
          pixQrCodeUrl: result.pixQrCodeUrl,
          expiresAt: result.expiresAt,
        },
      });

      return {
        orderId: order.id,
        pixCopyPaste: result.pixCopyPaste,
        pixQrCodeBase64: result.pixQrCodeBase64,
        pixQrCodeUrl: result.pixQrCodeUrl,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      // Se o gateway falhar, marca o pedido como FAILED para auditoria
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });
      throw error;
    }
  }

  // ── Criação de assinatura ────────────────────────────────────────────────

  async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionServiceResult> {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);
    if (!product.metadata) throw new Error(`Product ${dto.productId} has no gateway priceId configured in metadata`);

    // O priceId do Stripe deve estar no metadata do produto: { "stripePriceId": "price_xxx" }
    const meta = product.metadata as Record<string, string>;
    const priceId = meta['stripePriceId'];
    if (!priceId) throw new Error(`Product ${dto.productId} missing stripePriceId in metadata`);

    // Busca customer existente no Stripe (se o usuário já teve uma assinatura)
    const existingSub = await this.prisma.subscription.findFirst({
      where: {
        userId: dto.userId,
        gateway: PaymentGateway.STRIPE,
        gatewayCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 1. Cria o registro da subscription antes de chamar o gateway
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        status: SubscriptionStatus.PENDING,
        gateway: PaymentGateway.STRIPE,
        gatewayPriceId: priceId,
      },
    });

    try {
      const result = await this.stripeGateway.createSubscription({
        priceId,
        existingCustomerId: existingSub?.gatewayCustomerId ?? undefined,
        trialDays: product.trialDays ?? undefined,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        metadata: {
          telegramId: dto.telegramId.toString(),
          userId: dto.userId,
          subscriptionId: subscription.id,
        },
      });

      // 2. Atualiza com dados do gateway
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          gatewayCustomerId: result.gatewayCustomerId,
          checkoutSessionId: result.checkoutSessionId,
          checkoutUrl: result.checkoutUrl,
        },
      });

      return {
        subscriptionId: subscription.id,
        checkoutUrl: result.checkoutUrl,
      };
    } catch (error) {
      await this.prisma.subscription.delete({ where: { id: subscription.id } });
      throw error;
    }
  }

  // ── Cancelamento de assinatura ───────────────────────────────────────────

  async cancelSubscription(subscriptionId: string, immediately: boolean): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    if (!subscription.gatewaySubscriptionId) {
      throw new Error(`Subscription ${subscriptionId} has no gatewaySubscriptionId`);
    }

    await this.stripeGateway.cancelSubscription({
      gatewaySubscriptionId: subscription.gatewaySubscriptionId,
      immediately,
    });

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: !immediately,
        ...(immediately && {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'admin_cancelled',
        }),
      },
    });
  }

  // ── Processamento de webhook ──────────────────────────────────────────────

  async processWebhook(
    gateway: PaymentGateway,
    rawBody: Buffer,
    headers: Record<string, string>,
  ): Promise<void> {
    const gatewayInstance = gateway === PaymentGateway.EFI ? this.efiGateway : this.stripeGateway;

    // 1. Verifica assinatura e parseia o evento
    const parsed = gatewayInstance.parseWebhookEvent(rawBody, headers);

    if (parsed.eventType === 'unknown') {
      this.logger.debug(`Ignored unknown webhook event from ${gateway}`);
      return;
    }

    // 2. Idempotência: tenta inserir o evento; se já existir, ignora
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { gateway_eventId: { gateway, eventId: parsed.eventId } },
    });

    if (existing) {
      if (existing.status === WebhookStatus.PROCESSED) {
        this.logger.debug(`Duplicate webhook ${parsed.eventId} from ${gateway} — ignored`);
        return;
      }
      // Permite reprocessar eventos que falharam anteriormente
    }

    const webhookRecord = await this.prisma.webhookEvent.upsert({
      where: { gateway_eventId: { gateway, eventId: parsed.eventId } },
      create: {
        gateway,
        eventId: parsed.eventId,
        eventType: parsed.eventType,
        status: WebhookStatus.PROCESSING,
        payload: parsed.data as object,
        attempts: 1,
      },
      update: {
        status: WebhookStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });

    try {
      await this.dispatchWebhookEvent(parsed);

      await this.prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: WebhookStatus.PROCESSED, processedAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process webhook ${parsed.eventId}: ${message}`);

      await this.prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: WebhookStatus.FAILED, error: message },
      });

      throw error;
    }
  }

  // ── Dispatch por tipo de evento ───────────────────────────────────────────

  private async dispatchWebhookEvent(event: ParsedWebhookEvent): Promise<void> {
    switch (event.eventType) {
      case 'pix.paid':
        return this.handlePixPaid(event.data as PixPaidData);

      case 'subscription.activated':
        return this.handleSubscriptionActivated(event.data as SubscriptionActivatedData);

      case 'subscription.updated':
        return this.handleSubscriptionUpdated(event.data as SubscriptionUpdatedData);

      case 'subscription.cancelled':
        return this.handleSubscriptionCancelled(event.data as SubscriptionCancelledData);

      case 'subscription.past_due':
        return this.handleSubscriptionPastDue(event.data as SubscriptionPastDueData);

      case 'invoice.paid':
        return this.handleInvoicePaid(event.data as InvoicePaidData);

      case 'invoice.failed':
        return this.handleInvoiceFailed(event.data as InvoiceFailedData);

      default:
        this.logger.warn(`No handler for event type: ${event.eventType}`);
    }
  }

  // ── Handlers de eventos ───────────────────────────────────────────────────

  private async handlePixPaid(data: PixPaidData): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { gatewayTxid: data.txid },
      include: { user: true, product: true },
    });

    if (!order) {
      this.logger.warn(`No order found for txid ${data.txid}`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(`Order ${order.id} already paid — skipping`);
      return;
    }

    // Atualiza o pedido
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: data.paidAt,
        pixEndToEndId: data.endToEndId,
      },
    });

    // Cria o registro de acesso (sem inviteLink — gerado pelo BotEventsService)
    const access = await this.prisma.access.create({
      data: {
        userId: order.userId,
        productId: order.productId,
        chatId: order.product.chatId!,
        status: AccessStatus.ACTIVE,
        orderId: order.id,
      },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.PIX_CONFIRMED, {
      orderId: order.id,
      userId: order.userId,
      telegramId: order.user.telegramId,
      productId: order.productId,
      productName: order.product.name,
      chatId: order.product.chatId!,
      accessId: access.id,
      amount: data.amount,
    });
  }

  private async handleSubscriptionActivated(data: SubscriptionActivatedData): Promise<void> {
    // Busca pelo checkoutSessionId ou gatewaySubscriptionId
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { checkoutSessionId: data.checkoutSessionId },
          { gatewaySubscriptionId: data.gatewaySubscriptionId },
        ],
      },
      include: { user: true, product: true },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for checkout session ${data.checkoutSessionId}`);
      return;
    }

    await this.prisma.subscription.update({
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

    const access = await this.prisma.access.create({
      data: {
        userId: subscription.userId,
        productId: subscription.productId,
        chatId: subscription.product.chatId!,
        status: AccessStatus.ACTIVE,
        subscriptionId: subscription.id,
      },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
      chatId: subscription.product.chatId!,
      accessId: access.id,
    });
  }

  private async handleSubscriptionUpdated(data: SubscriptionUpdatedData): Promise<void> {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      cancelled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.UNPAID,
      incomplete: SubscriptionStatus.PENDING,
    };

    await this.prisma.subscription.updateMany({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      data: {
        status: statusMap[data.status] ?? SubscriptionStatus.PAST_DUE,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });
  }

  private async handleSubscriptionCancelled(data: SubscriptionCancelledData): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: { user: true, product: true },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: data.cancelledAt },
    });

    // Revoga o acesso
    await this.prisma.access.updateMany({
      where: { subscriptionId: subscription.id, status: AccessStatus.ACTIVE },
      data: {
        status: AccessStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: 'subscription_cancelled',
      },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_CANCELLED, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    });
  }

  private async handleSubscriptionPastDue(data: SubscriptionPastDueData): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: { user: true, product: true },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_PAST_DUE, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    });
  }

  private async handleInvoicePaid(data: InvoicePaidData): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: { user: true },
    });

    if (!subscription) return;

    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        gatewayInvoiceId: data.gatewayInvoiceId,
        gatewayPaymentId: data.gatewayPaymentId,
        amount: data.amount,
        currency: 'BRL',
        status: 'PAID',
        paidAt: data.paidAt,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.INVOICE_PAID, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      gatewayInvoiceId: data.gatewayInvoiceId,
      amount: data.amount,
    });
  }

  private async handleInvoiceFailed(data: InvoiceFailedData): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: data.gatewaySubscriptionId },
      include: { user: true, product: true },
    });

    if (!subscription) return;

    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        gatewayInvoiceId: data.gatewayInvoiceId,
        amount: 0,
        currency: 'BRL',
        status: 'FAILED',
        failedAt: data.failedAt,
      },
    });

    this.eventEmitter.emit(PAYMENT_EVENTS.INVOICE_FAILED, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      telegramId: subscription.user.telegramId,
      productId: subscription.productId,
      productName: subscription.product.name,
    });
  }
}
