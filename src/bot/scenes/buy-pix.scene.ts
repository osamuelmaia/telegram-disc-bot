import { Logger } from '@nestjs/common';
import { Action, Ctx, Scene, SceneEnter } from 'nestjs-telegraf';
import { CheckoutService } from '../../checkout/checkout.interface';
import { BotContext } from '../bot.context';
import { Messages } from '../bot.messages';
import { cancelCheckoutKeyboard } from '../keyboards/product.keyboard';
import { mainKeyboard } from '../keyboards/main.keyboard';

export const BUY_PIX_SCENE = 'BUY_PIX_SCENE';

// =============================================================================
// Fluxo Pix
// =============================================================================
// Entrada: ctx.session.selectedProductId deve estar preenchido antes de entrar.
//
// Sequência:
//   1. @SceneEnter → chama checkout.createPixCharge()
//   2a. Se tiver QR Code base64 → envia como foto com caption
//   2b. Se não tiver imagem → envia texto com copia-e-cola
//   3. Sai da cena — a confirmação chega via webhook e notifica o usuário
// =============================================================================

@Scene(BUY_PIX_SCENE)
export class BuyPixScene {
  private readonly logger = new Logger(BuyPixScene.name);

  constructor(private readonly checkout: CheckoutService) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: BotContext): Promise<void> {
    const productId = ctx.session.selectedProductId;
    const telegramId = BigInt(ctx.from!.id);

    if (!productId) {
      this.logger.warn(`BuyPixScene entered without selectedProductId for user ${telegramId}`);
      await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
      await ctx.scene.leave();
      return;
    }

    try {
      const result = await this.checkout.createPixCharge(telegramId, productId);

      if (result.pixQrCodeBase64) {
        // Envia a imagem do QR Code com a mensagem de instrução como legenda
        await ctx.replyWithPhoto(
          { source: Buffer.from(result.pixQrCodeBase64, 'base64') },
          {
            caption: Messages.pix.ready(result.pixCopyPaste, result.expiresAt),
            parse_mode: 'MarkdownV2',
            ...cancelCheckoutKeyboard('pix'),
          },
        );
      } else {
        // Fallback: apenas o código copia-e-cola em texto
        await ctx.reply(Messages.pix.readyNoImage(result.pixCopyPaste, result.expiresAt), {
          parse_mode: 'MarkdownV2',
          ...cancelCheckoutKeyboard('pix'),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create Pix charge for user ${telegramId}, product ${productId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await ctx.reply(Messages.pix.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
    } finally {
      // A cena termina aqui — a confirmação do pagamento é tratada pelo webhook,
      // que notificará o usuário de forma assíncrona via BotService.
      await ctx.scene.leave();
    }
  }

  @Action('cancel_pix')
  async onCancel(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery('Pagamento cancelado.');
    await ctx.editMessageCaption
      ? await ctx
          .editMessageCaption(Messages.pix.cancelled, { parse_mode: 'MarkdownV2' })
          .catch(() => ctx.reply(Messages.pix.cancelled, { parse_mode: 'MarkdownV2' }))
      : await ctx.reply(Messages.pix.cancelled, { parse_mode: 'MarkdownV2' });
    await ctx.scene.leave();
  }
}
