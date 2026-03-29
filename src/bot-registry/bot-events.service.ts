import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { BotRegistryService } from './bot-registry.service';
import {
  ACCESS_EVENTS,
  AccessManuallyRevokedEvent,
  PAYMENT_EVENTS,
  PixConfirmedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPastDueEvent,
  InvoiceFailedEvent,
} from '../payment/payment.events';

// =============================================================================
// BotEventsService — escuta eventos de pagamento e notifica usuários no Telegram
// =============================================================================
// Desacoplado do WebhookService: recebe eventos via EventEmitter2 e usa
// BotRegistryService para enviar mensagens/invite links ao usuário correto.
// =============================================================================

@Injectable()
export class BotEventsService {
  private readonly logger = new Logger(BotEventsService.name);

  constructor(
    private readonly botRegistry: BotRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Pix confirmado ────────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.PIX_CONFIRMED)
  async onPixConfirmed(event: PixConfirmedEvent): Promise<void> {
    try {
      const bot = this.botRegistry.getBot(await this.getTenantIdByAccess(event.accessId));
      if (!bot) return;

      const telegramId = Number(event.telegramId);

      // Tenta gerar link de convite único para o canal
      let inviteText = '';
      try {
        const link = await bot.telegram.createChatInviteLink(event.chatId, {
          creates_join_request: false,
          member_limit: 1,
        });

        // Salva o invite link no registro de acesso
        await this.prisma.access.update({
          where: { id: event.accessId },
          data: { inviteLink: link.invite_link },
        });

        inviteText = `\n\n🔗 [Clique aqui para entrar](${link.invite_link})`;
      } catch (err) {
        this.logger.warn(`[${event.accessId}] Could not generate invite link: ${err}`);
        inviteText = `\n\n💬 Procure o suporte para receber o link de acesso.`;
      }

      await bot.telegram.sendMessage(
        telegramId,
        `✅ *Pagamento confirmado\\!*\n\nSeu acesso ao produto *${this.escape(event.productName)}* foi liberado\\.${this.escape(inviteText)}`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[PIX_CONFIRMED] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Assinatura ativada ────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED)
  async onSubscriptionActivated(event: SubscriptionActivatedEvent): Promise<void> {
    try {
      const tenantId = await this.getTenantIdByAccess(event.accessId);
      const bot = this.botRegistry.getBot(tenantId);
      if (!bot) return;

      const telegramId = Number(event.telegramId);

      let inviteText = '';
      try {
        const link = await bot.telegram.createChatInviteLink(event.chatId, {
          creates_join_request: false,
          member_limit: 1,
        });

        await this.prisma.access.update({
          where: { id: event.accessId },
          data: { inviteLink: link.invite_link },
        });

        inviteText = `\n\n🔗 [Clique aqui para entrar](${link.invite_link})`;
      } catch (err) {
        this.logger.warn(`[${event.accessId}] Could not generate invite link: ${err}`);
        inviteText = `\n\n💬 Procure o suporte para receber o link de acesso.`;
      }

      await bot.telegram.sendMessage(
        telegramId,
        `✅ *Assinatura ativada\\!*\n\nSua assinatura do produto *${this.escape(event.productName)}* está ativa\\.${this.escape(inviteText)}`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[SUBSCRIPTION_ACTIVATED] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Assinatura cancelada ──────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_CANCELLED)
  async onSubscriptionCancelled(event: SubscriptionCancelledEvent): Promise<void> {
    try {
      const tenantId = await this.getTenantIdBySubscription(event.subscriptionId);
      const bot = this.botRegistry.getBot(tenantId);
      if (!bot) return;

      await bot.telegram.sendMessage(
        Number(event.telegramId),
        `❌ *Assinatura cancelada*\n\nSua assinatura do produto *${this.escape(event.productName)}* foi cancelada\\. Seu acesso foi removido\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[SUBSCRIPTION_CANCELLED] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Pagamento em atraso ───────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_PAST_DUE)
  async onSubscriptionPastDue(event: SubscriptionPastDueEvent): Promise<void> {
    try {
      const tenantId = await this.getTenantIdBySubscription(event.subscriptionId);
      const bot = this.botRegistry.getBot(tenantId);
      if (!bot) return;

      await bot.telegram.sendMessage(
        Number(event.telegramId),
        `⚠️ *Pagamento em atraso*\n\nIdentificamos um problema no pagamento da sua assinatura *${this.escape(event.productName)}*\\. Por favor, atualize seu método de pagamento para manter o acesso\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[SUBSCRIPTION_PAST_DUE] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Fatura falhou ─────────────────────────────────────────────────────────

  @OnEvent(PAYMENT_EVENTS.INVOICE_FAILED)
  async onInvoiceFailed(event: InvoiceFailedEvent): Promise<void> {
    try {
      const tenantId = await this.getTenantIdBySubscription(event.subscriptionId);
      const bot = this.botRegistry.getBot(tenantId);
      if (!bot) return;

      await bot.telegram.sendMessage(
        Number(event.telegramId),
        `⚠️ *Falha no pagamento*\n\nNão conseguimos processar o pagamento da sua assinatura *${this.escape(event.productName)}*\\. Verifique seu método de pagamento\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[INVOICE_FAILED] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Acesso revogado manualmente ───────────────────────────────────────────

  @OnEvent(ACCESS_EVENTS.MANUALLY_REVOKED)
  async onAccessRevoked(event: AccessManuallyRevokedEvent): Promise<void> {
    try {
      const tenantId = await this.getTenantIdByAccess(event.accessId);
      const bot = this.botRegistry.getBot(tenantId);
      if (!bot) return;

      await bot.telegram.sendMessage(
        Number(event.telegramId),
        `❌ *Acesso removido*\n\nSeu acesso ao produto *${this.escape(event.productName)}* foi removido\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    } catch (err) {
      this.logger.error(`[ACCESS_REVOKED] Error notifying user ${event.endUserId}: ${err}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getTenantIdByAccess(accessId: string): Promise<string> {
    const access = await this.prisma.access.findUniqueOrThrow({
      where: { id: accessId },
      select: { tenantId: true },
    });
    return access.tenantId;
  }

  private async getTenantIdBySubscription(subscriptionId: string): Promise<string> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      select: { tenantId: true },
    });
    return sub.tenantId;
  }

  private escape(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}
