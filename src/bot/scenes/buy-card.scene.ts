import { Logger } from '@nestjs/common';
import { Action, Ctx, Scene, SceneEnter } from 'nestjs-telegraf';
import { CheckoutService } from '../../checkout/checkout.interface';
import { BotContext } from '../bot.context';
import { Messages } from '../bot.messages';
import { cancelCheckoutKeyboard } from '../keyboards/product.keyboard';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { Markup } from 'telegraf';

export const BUY_CARD_SCENE = 'BUY_CARD_SCENE';

// =============================================================================
// Fluxo Cartão (Assinatura Recorrente)
// =============================================================================
// Entrada: ctx.session.selectedProductId deve estar preenchido antes de entrar.
//
// Sequência:
//   1. @SceneEnter → chama checkout.createCardCheckout()
//   2. Envia mensagem com botão apontando para o Stripe Checkout (link externo)
//   3. Sai da cena — a ativação da assinatura chega via webhook
//
// O checkout é 100% externo (Stripe Checkout Hosted).
// O bot nunca toca em dados de cartão — zero PCI scope.
// =============================================================================

@Scene(BUY_CARD_SCENE)
export class BuyCardScene {
  private readonly logger = new Logger(BuyCardScene.name);

  constructor(private readonly checkout: CheckoutService) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: BotContext): Promise<void> {
    const productId = ctx.session.selectedProductId;
    const telegramId = BigInt(ctx.from!.id);

    if (!productId) {
      this.logger.warn(`BuyCardScene entered without selectedProductId for user ${telegramId}`);
      await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
      await ctx.scene.leave();
      return;
    }

    try {
      const result = await this.checkout.createCardCheckout(telegramId, productId);

      await ctx.reply(Messages.card.ready(result.checkoutUrl), {
        parse_mode: 'MarkdownV2',
        // Botão de acesso direto + opção de cancelar
        ...Markup.inlineKeyboard([
          [Markup.button.url('💳  Ir para o checkout', result.checkoutUrl)],
          [Markup.button.callback('❌  Cancelar', 'cancel_card')],
        ]),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create card checkout for user ${telegramId}, product ${productId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await ctx.reply(Messages.card.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
    } finally {
      // A cena termina aqui — a ativação da assinatura é tratada pelo webhook,
      // que notificará o usuário de forma assíncrona via BotService.
      await ctx.scene.leave();
    }
  }

  @Action('cancel_card')
  async onCancel(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery('Ação cancelada.');
    await ctx
      .editMessageText(Messages.card.aborted, {
        parse_mode: 'MarkdownV2',
        ...mainKeyboard(),
      })
      .catch(() =>
        ctx.reply(Messages.card.aborted, { parse_mode: 'MarkdownV2', ...mainKeyboard() }),
      );
    await ctx.scene.leave();
  }
}
