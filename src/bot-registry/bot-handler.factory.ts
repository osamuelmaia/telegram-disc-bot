import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Scenes, session } from 'telegraf';
import { BotContext } from './bot.context';
import { EndUserService } from '../end-user/end-user.service';
import { ProductService } from '../product/product.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildProductDetailKeyboard, buildProductListKeyboard } from './keyboards/product.keyboard';

@Injectable()
export class BotHandlerFactory {
  private readonly logger = new Logger(BotHandlerFactory.name);

  constructor(
    private readonly endUserService: EndUserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
  ) {}

  applyHandlers(bot: Telegraf<BotContext>, tenantId: string): void {
    // Injeta tenantId no contexto
    bot.use((ctx, next) => {
      ctx.tenantId = tenantId;
      return next();
    });

    bot.use(session());

    const stage = new Scenes.Stage<BotContext>([]);
    bot.use(stage.middleware());

    // /start
    bot.start(async (ctx) => {
      try {
        const from = ctx.from!;
        await this.endUserService.upsert({
          tenantId,
          telegramId: BigInt(from.id),
          username: from.username,
          firstName: from.first_name,
          lastName: from.last_name,
        });

        const botConfig = await this.prisma.bot.findUnique({ where: { tenantId } });
        const welcome = botConfig?.welcomeMessage ??
          `Olá, ${from.first_name}! 👋\nUse /produtos para ver o que temos disponível.`;

        await ctx.reply(welcome);
      } catch (err) {
        this.logger.error(`[${tenantId}] /start error: ${err}`);
      }
    });

    // /produtos
    bot.command('produtos', async (ctx) => {
      await this.showProducts(ctx, tenantId);
    });

    // action: listar produtos
    bot.action('show_products', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showProducts(ctx, tenantId);
    });

    // action: detalhe do produto
    bot.action(/^product_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const productId = ctx.match[1];
      const product = await this.productService.findById(tenantId, productId);
      if (!product) {
        await ctx.reply('Produto não encontrado.');
        return;
      }
      const text = [
        `*${this.escape(product.name)}*`,
        product.description ? `\n${this.escape(product.description)}` : '',
        `\n\n💰 R$ ${Number(product.price).toFixed(2)}`,
        product.type === 'RECURRING' ? ` / ${product.billingInterval === 'YEARLY' ? 'ano' : 'mês'}` : '',
        product.trialDays ? `\n🎁 ${product.trialDays} dias grátis` : '',
      ].join('');

      await ctx.editMessageText(text, {
        parse_mode: 'MarkdownV2',
        reply_markup: buildProductDetailKeyboard(product.id, product.type).reply_markup,
      });
    });

    // action: pagar pix
    bot.action(/^pay_pix_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const productId = ctx.match[1];
      const from = ctx.from!;

      const product = await this.productService.findById(tenantId, productId);
      if (!product) { await ctx.reply('Produto não encontrado.'); return; }

      // Upsert do end user
      const endUser = await this.endUserService.upsert({
        tenantId,
        telegramId: BigInt(from.id),
        username: from.username,
        firstName: from.first_name,
      });

      await ctx.reply(
        `⏳ Gerando QR Code para *${this.escape(product.name)}*\\.\\.\\.`,
        { parse_mode: 'MarkdownV2' },
      );

      try {
        const order = await this.orderService.createPixOrder(tenantId, endUser.id, productId);

        if (!order.pixCopyPaste) {
          await ctx.reply('❌ Não foi possível gerar o QR Code. Tente novamente mais tarde.');
          return;
        }

        const expiresMinutes = order.expiresAt
          ? Math.round((order.expiresAt.getTime() - Date.now()) / 60000)
          : 60;

        const msg = [
          `💰 *${this.escape(product.name)}*`,
          `Valor: R$ ${Number(order.amount).toFixed(2)}`,
          ``,
          `📋 *Pix Copia e Cola:*`,
          `\`${order.pixCopyPaste}\``,
          ``,
          `⏰ Expira em ${expiresMinutes} minutos`,
          ``,
          `Após o pagamento, você receberá o link de acesso automaticamente\\.`,
        ].join('\n');

        await ctx.reply(msg, { parse_mode: 'MarkdownV2' });

        // Envia imagem do QR Code se disponível
        if (order.pixQrCodeBase64) {
          const qrBuffer = Buffer.from(order.pixQrCodeBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          await ctx.replyWithPhoto({ source: qrBuffer }, { caption: 'QR Code para pagamento Pix' });
        }
      } catch (err) {
        this.logger.error(`[${tenantId}] Failed to create Pix order for product ${productId}: ${err}`);
        await ctx.reply('❌ Não foi possível processar o pagamento. Verifique com o suporte.');
      }
    });

    // /ajuda
    bot.command('ajuda', async (ctx) => {
      const botConfig = await this.prisma.bot.findUnique({ where: { tenantId } });
      const support = botConfig?.supportContact ? `\n\nSuporte: ${botConfig.supportContact}` : '';
      await ctx.reply(`ℹ️ *Ajuda*\n/produtos \\- Ver produtos disponíveis\n/start \\- Reiniciar${this.escape(support)}`, {
        parse_mode: 'MarkdownV2',
      });
    });

    // Erros não capturados
    bot.catch((err, ctx) => {
      this.logger.error(`[${tenantId}] Unhandled error for ${ctx.updateType}: ${err}`);
    });
  }

  private async showProducts(ctx: BotContext, tenantId: string) {
    const products = await this.productService.findAllActive(tenantId);
    if (products.length === 0) {
      await ctx.reply('Nenhum produto disponível no momento.');
      return;
    }
    await ctx.reply('Escolha um produto:', buildProductListKeyboard(products));
  }

  private escape(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}
