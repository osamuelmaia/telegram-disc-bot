import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessStatus, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ParsedWebhookEvent,
  PixPaidData,
  WebhookEventType,
} from '../../payment/interfaces/payment-gateway.interface';
import { PAYMENT_EVENTS, PixConfirmedEvent } from '../../payment/payment.events';
import { WalletService } from '../../wallet/wallet.service';
import { IWebhookProcessor } from './webhook-processor.interface';

@Injectable()
export class PixWebhookProcessor implements IWebhookProcessor {
  readonly supportedEvents: ReadonlyArray<WebhookEventType> = ['pix.paid'];

  private readonly logger = new Logger(PixWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly walletService: WalletService,
  ) {}

  canHandle(eventType: WebhookEventType): boolean {
    return this.supportedEvents.includes(eventType);
  }

  async handle(event: ParsedWebhookEvent, webhookEventId: string): Promise<void> {
    const data = event.data as PixPaidData;

    this.logger.log(
      `[wh:${webhookEventId}] Processing pix.paid — txid=${data.txid}`,
    );

    const order = await this.prisma.order.findFirst({
      where: { gatewayTxid: data.txid },
      include: {
        endUser: { select: { id: true, telegramId: true } },
        product: { select: { id: true, name: true, chatId: true } },
      },
    });

    if (!order) {
      this.logger.warn(`[wh:${webhookEventId}] No order found for txid=${data.txid} — skipping`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(
        `[wh:${webhookEventId}] Order ${order.id} already PAID — idempotent skip`,
      );
      return;
    }

    if (!order.product.chatId) {
      this.logger.error(
        `[wh:${webhookEventId}] Product ${order.product.id} has no chatId — cannot grant access`,
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: data.paidAt,
          pixEndToEndId: data.endToEndId,
        },
      });
      return;
    }

    // Atômico: pedido + acesso
    const access = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: data.paidAt,
          pixEndToEndId: data.endToEndId,
        },
      });

      const existing = await tx.access.findUnique({ where: { orderId: order.id } });
      if (existing) return existing;

      return tx.access.create({
        data: {
          tenantId: order.tenantId,
          endUserId: order.endUserId,
          productId: order.productId,
          chatId: order.product.chatId!,
          status: AccessStatus.ACTIVE,
          orderId: order.id,
        },
      });
    });

    this.logger.log(
      `[wh:${webhookEventId}] Order ${order.id} marked PAID — access=${access.id} granted`,
    );

    // Credita o valor líquido na carteira do tenant
    try {
      await this.walletService.creditSale(
        order.tenantId,
        order.id,
        new Decimal(order.amount.toString()),
        new Decimal(order.platformFeeAmount.toString()),
      );
    } catch (walletErr) {
      // Não bloqueia o fluxo principal, mas loga o erro
      this.logger.error(
        `[wh:${webhookEventId}] Failed to credit wallet for order ${order.id}: ${walletErr}`,
      );
    }

    const payload: PixConfirmedEvent = {
      orderId: order.id,
      endUserId: order.endUserId,
      telegramId: order.endUser.telegramId,
      productId: order.productId,
      productName: order.product.name,
      chatId: order.product.chatId!,
      accessId: access.id,
      amount: data.amount,
    };

    this.events.emit(PAYMENT_EVENTS.PIX_CONFIRMED, payload);
  }
}
