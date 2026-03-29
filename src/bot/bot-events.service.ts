import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvoiceFailedEvent,
  InvoicePaidEvent,
  PAYMENT_EVENTS,
  PixConfirmedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPastDueEvent,
} from '../payment/payment.events';
import { Messages } from './bot.messages';
import { accessGrantedKeyboard, mainKeyboard } from './keyboards/product.keyboard';
import { BotContext } from './bot.context';

// =============================================================================
// BotEventsService — Escuta eventos de pagamento e notifica o usuário
// =============================================================================
// Desacopla o módulo de pagamento do bot:
//   PaymentService emite evento → BotEventsService ouve → envia mensagem Telegram
//
// Também é responsável por gerar o invite link do grupo/canal e
// associá-lo ao registro de Access no banco.
// =============================================================================

@Injectable()
export class BotEventsService {
  private readonly logger = new Logger(BotEventsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<BotContext>,
    private readonly prisma: PrismaService,
  ) {}

  // ── Pix confirmado ────────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.PIX_CONFIRMED)
  async onPixConfirmed(event: PixConfirmedEvent): Promise<void> {
    this.logger.log(`Pix confirmed: order=${event.orderId} user=${event.userId}`);

    try {
      const inviteLink = await this.generateInviteLink(event.chatId, event.accessId);

      await this.bot.telegram.sendMessage(
        Number(event.telegramId),
        Messages.pix.confirmed(event.productName),
        {
          parse_mode: 'MarkdownV2',
          ...accessGrantedKeyboard(inviteLink),
        },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${event.telegramId} of Pix confirmation`, error);
    }
  }

  // ── Assinatura ativada ────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED)
  async onSubscriptionActivated(event: SubscriptionActivatedEvent): Promise<void> {
    this.logger.log(`Subscription activated: sub=${event.subscriptionId} user=${event.userId}`);

    try {
      const inviteLink = await this.generateInviteLink(event.chatId, event.accessId);

      await this.bot.telegram.sendMessage(
        Number(event.telegramId),
        Messages.card.confirmed(event.productName),
        {
          parse_mode: 'MarkdownV2',
          ...accessGrantedKeyboard(inviteLink),
        },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${event.telegramId} of subscription activation`, error);
    }
  }

  // ── Assinatura cancelada ──────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_CANCELLED)
  async onSubscriptionCancelled(event: SubscriptionCancelledEvent): Promise<void> {
    this.logger.log(`Subscription cancelled: sub=${event.subscriptionId} user=${event.userId}`);

    try {
      // Kick do usuário no grupo/canal
      await this.kickUserFromProduct(event.userId, event.productId, event.telegramId);

      await this.bot.telegram.sendMessage(
        Number(event.telegramId),
        Messages.card.cancelled(event.productName),
        { parse_mode: 'MarkdownV2', ...mainKeyboard() },
      );
    } catch (error) {
      this.logger.error(`Failed to process subscription cancellation for user ${event.telegramId}`, error);
    }
  }

  // ── Pagamento em atraso ───────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_PAST_DUE)
  async onSubscriptionPastDue(event: SubscriptionPastDueEvent): Promise<void> {
    this.logger.log(`Subscription past due: sub=${event.subscriptionId} user=${event.userId}`);

    try {
      await this.bot.telegram.sendMessage(
        Number(event.telegramId),
        Messages.card.pastDue(event.productName),
        { parse_mode: 'MarkdownV2' },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${event.telegramId} of past due`, error);
    }
  }

  // ── Fatura paga (renovação) ───────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.INVOICE_PAID)
  async onInvoicePaid(event: InvoicePaidEvent): Promise<void> {
    // Apenas loga — não notifica por padrão para não poluir o chat a cada renovação.
    // Ative a notificação abaixo se desejar informar o usuário de cada cobrança.
    this.logger.log(
      `Invoice paid: sub=${event.subscriptionId} amount=${event.amount} user=${event.userId}`,
    );
  }

  // ── Fatura falhou ─────────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.INVOICE_FAILED)
  async onInvoiceFailed(event: InvoiceFailedEvent): Promise<void> {
    this.logger.warn(`Invoice failed: sub=${event.subscriptionId} user=${event.userId}`);

    try {
      await this.bot.telegram.sendMessage(
        Number(event.telegramId),
        Messages.card.pastDue(event.productName),
        { parse_mode: 'MarkdownV2' },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${event.telegramId} of invoice failure`, error);
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Gera um invite link de uso único para o grupo/canal e salva no Access.
   * O link expira automaticamente após 1 uso (memberLimit: 1).
   */
  private async generateInviteLink(chatId: string, accessId: string): Promise<string> {
    const link = await this.bot.telegram.createChatInviteLink(chatId, {
      member_limit: 1,
      // Expira em 24 horas para evitar links órfãos
      expire_date: Math.floor(Date.now() / 1000) + 86_400,
    });

    await this.prisma.access.update({
      where: { id: accessId },
      data: { inviteLink: link.invite_link },
    });

    return link.invite_link;
  }

  /**
   * Remove o usuário do grupo/canal associado ao produto cancelado.
   */
  private async kickUserFromProduct(
    userId: string,
    productId: string,
    telegramId: bigint,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });

    if (!product?.chatId) {
      this.logger.warn(`Product ${productId} has no chatId — cannot kick user`);
      return;
    }

    try {
      await this.bot.telegram.banChatMember(product.chatId, Number(telegramId));
      // Desbane imediatamente para que o usuário possa reingressar no futuro se reativar
      await this.bot.telegram.unbanChatMember(product.chatId, Number(telegramId));
    } catch (error) {
      // Pode falhar se o usuário já saiu do grupo — não é erro crítico
      this.logger.warn(`Could not kick user ${telegramId} from chat ${product.chatId}: ${error}`);
    }
  }
}
