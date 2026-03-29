import { Logger } from '@nestjs/common';
import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import { AccessService } from '../access/access.service';
import { BotContext } from './bot.context';
import { Messages } from './bot.messages';
import { mainKeyboard } from './keyboards/main.keyboard';
import { paymentMethodKeyboard, productListKeyboard } from './keyboards/product.keyboard';
import { BUY_CARD_SCENE } from './scenes/buy-card.scene';
import { BUY_PIX_SCENE } from './scenes/buy-pix.scene';

// =============================================================================
// BotUpdate — Handlers principais do bot
// =============================================================================
// Responsável por:
//   - /start: boas-vindas + upsert do usuário
//   - Navegação principal: produtos, acessos, suporte
//   - Seleção de produto e método de pagamento
//   - Entrada nas scenes de checkout (Pix / Cartão)
//
// NÃO processa pagamentos diretamente. Delega ao CheckoutService via scenes.
// =============================================================================

@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly accessService: AccessService,
  ) {}

  // ── /start ──────────────────────────────────────────────────────────────────

  @Start()
  async onStart(@Ctx() ctx: BotContext): Promise<void> {
    const { id, first_name, last_name, username } = ctx.from!;

    try {
      await this.userService.upsert({
        telegramId: BigInt(id),
        firstName: first_name,
        lastName: last_name,
        username,
      });
    } catch (error) {
      this.logger.error(`Failed to upsert user ${id}`, error);
    }

    await ctx.reply(Messages.welcome(first_name), {
      parse_mode: 'MarkdownV2',
      ...mainKeyboard(),
    });
  }

  // ── Menu principal ───────────────────────────────────────────────────────────

  @Action('back_to_menu')
  async onBackToMenu(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    await ctx
      .editMessageText(Messages.welcome(ctx.from!.first_name), {
        parse_mode: 'MarkdownV2',
        ...mainKeyboard(),
      })
      .catch(() =>
        ctx.reply(Messages.welcome(ctx.from!.first_name), {
          parse_mode: 'MarkdownV2',
          ...mainKeyboard(),
        }),
      );
  }

  // ── Ver produtos ─────────────────────────────────────────────────────────────

  @Action('show_products')
  async onShowProducts(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();

    try {
      const products = await this.productService.findAllActive();

      if (products.length === 0) {
        await ctx
          .editMessageText(Messages.productList.empty, {
            parse_mode: 'MarkdownV2',
            ...mainKeyboard(),
          })
          .catch(() =>
            ctx.reply(Messages.productList.empty, {
              parse_mode: 'MarkdownV2',
              ...mainKeyboard(),
            }),
          );
        return;
      }

      await ctx
        .editMessageText(Messages.productList.header, {
          parse_mode: 'MarkdownV2',
          ...productListKeyboard(products),
        })
        .catch(() =>
          ctx.reply(Messages.productList.header, {
            parse_mode: 'MarkdownV2',
            ...productListKeyboard(products),
          }),
        );
    } catch (error) {
      this.logger.error('Failed to fetch products', error);
      await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
    }
  }

  // ── Selecionar produto ────────────────────────────────────────────────────────

  @Action(/^select_product_(.+)$/)
  async onSelectProduct(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();

    const productId = (ctx.match as RegExpMatchArray)[1];

    try {
      const product = await this.productService.findById(productId);

      if (!product) {
        await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
        return;
      }

      await ctx
        .editMessageText(Messages.productDetail(product), {
          parse_mode: 'MarkdownV2',
          ...paymentMethodKeyboard(product),
        })
        .catch(() =>
          ctx.reply(Messages.productDetail(product), {
            parse_mode: 'MarkdownV2',
            ...paymentMethodKeyboard(product),
          }),
        );
    } catch (error) {
      this.logger.error(`Failed to fetch product ${productId}`, error);
      await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
    }
  }

  // ── Iniciar checkout Pix ──────────────────────────────────────────────────────

  @Action(/^pay_pix_(.+)$/)
  async onPayPix(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();

    const productId = (ctx.match as RegExpMatchArray)[1];
    ctx.session.selectedProductId = productId;

    // Atualiza a mensagem para "gerando..." antes de entrar na scene,
    // garantindo feedback imediato enquanto o gateway processa.
    await ctx
      .editMessageText(Messages.pix.generating, { parse_mode: 'MarkdownV2' })
      .catch(() => ctx.reply(Messages.pix.generating, { parse_mode: 'MarkdownV2' }));

    await ctx.scene.enter(BUY_PIX_SCENE);
  }

  // ── Iniciar checkout Cartão ──────────────────────────────────────────────────

  @Action(/^pay_card_(.+)$/)
  async onPayCard(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();

    const productId = (ctx.match as RegExpMatchArray)[1];
    ctx.session.selectedProductId = productId;

    await ctx
      .editMessageText(Messages.card.generating, { parse_mode: 'MarkdownV2' })
      .catch(() => ctx.reply(Messages.card.generating, { parse_mode: 'MarkdownV2' }));

    await ctx.scene.enter(BUY_CARD_SCENE);
  }

  // ── Meus acessos ─────────────────────────────────────────────────────────────

  @Action('my_accesses')
  async onMyAccesses(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();

    const telegramId = BigInt(ctx.from!.id);

    try {
      const user = await this.userService.findByTelegramId(telegramId);

      if (!user) {
        await ctx
          .editMessageText(Messages.myAccesses.empty, {
            parse_mode: 'MarkdownV2',
            ...mainKeyboard(),
          })
          .catch(() =>
            ctx.reply(Messages.myAccesses.empty, {
              parse_mode: 'MarkdownV2',
              ...mainKeyboard(),
            }),
          );
        return;
      }

      const accesses = await this.accessService.findActiveByUserId(user.id);

      if (accesses.length === 0) {
        await ctx
          .editMessageText(Messages.myAccesses.empty, {
            parse_mode: 'MarkdownV2',
            ...mainKeyboard(),
          })
          .catch(() =>
            ctx.reply(Messages.myAccesses.empty, {
              parse_mode: 'MarkdownV2',
              ...mainKeyboard(),
            }),
          );
        return;
      }

      const lines = accesses.map((a) => Messages.myAccesses.item(a)).join('\n');
      const text = `${Messages.myAccesses.header(accesses.length)}\n\n${lines}`;

      await ctx
        .editMessageText(text, { parse_mode: 'MarkdownV2', ...mainKeyboard() })
        .catch(() => ctx.reply(text, { parse_mode: 'MarkdownV2', ...mainKeyboard() }));
    } catch (error) {
      this.logger.error(`Failed to fetch accesses for user ${telegramId}`, error);
      await ctx.reply(Messages.error, { parse_mode: 'MarkdownV2', ...mainKeyboard() });
    }
  }

  // ── Suporte ───────────────────────────────────────────────────────────────────

  @Action('support')
  async onSupport(@Ctx() ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    await ctx
      .editMessageText(Messages.support, { parse_mode: 'MarkdownV2', ...mainKeyboard() })
      .catch(() => ctx.reply(Messages.support, { parse_mode: 'MarkdownV2', ...mainKeyboard() }));
  }
}
