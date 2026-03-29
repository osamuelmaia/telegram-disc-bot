import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotContext } from './bot.context';
import { BotHandlerFactory } from './bot-handler.factory';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotRegistryService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BotRegistryService.name);
  private readonly bots = new Map<string, Telegraf<BotContext>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlerFactory: BotHandlerFactory,
  ) {}

  async onApplicationBootstrap() {
    const activeBots = await this.prisma.bot.findMany({
      where: { status: 'ACTIVE' },
    });
    this.logger.log(`Loading ${activeBots.length} active bot(s)...`);
    await Promise.allSettled(
      activeBots.map((b) => this.register(b.tenantId, b.token)),
    );
  }

  async onApplicationShutdown() {
    this.logger.log('Stopping all bots...');
    await Promise.allSettled(
      [...this.bots.keys()].map((tenantId) => this.deregister(tenantId)),
    );
  }

  async register(tenantId: string, token: string): Promise<void> {
    await this.deregister(tenantId);

    try {
      const bot = new Telegraf<BotContext>(token);
      this.handlerFactory.applyHandlers(bot, tenantId);

      bot.launch({ dropPendingUpdates: true }).catch((err) => {
        this.logger.error(`[${tenantId}] Bot crashed: ${err.message}`);
        this.prisma.bot
          .update({ where: { tenantId }, data: { status: 'ERROR' } })
          .catch(() => null);
        this.bots.delete(tenantId);
      });

      // Validate token by calling getMe
      const info = await bot.telegram.getMe();
      this.bots.set(tenantId, bot);

      await this.prisma.bot.update({
        where: { tenantId },
        data: { status: 'ACTIVE', username: info.username },
      });

      this.logger.log(`[${tenantId}] Bot @${info.username} started`);
    } catch (err) {
      this.logger.error(`[${tenantId}] Failed to start bot: ${err.message}`);
      await this.prisma.bot
        .update({ where: { tenantId }, data: { status: 'ERROR' } })
        .catch(() => null);
      throw err;
    }
  }

  async deregister(tenantId: string): Promise<void> {
    const existing = this.bots.get(tenantId);
    if (existing) {
      try { existing.stop(); } catch {}
      this.bots.delete(tenantId);
      this.logger.log(`[${tenantId}] Bot stopped`);
    }
  }

  async reload(tenantId: string): Promise<void> {
    const bot = await this.prisma.bot.findUnique({ where: { tenantId } });
    if (!bot) throw new Error(`No bot config for tenant ${tenantId}`);
    await this.register(tenantId, bot.token);
  }

  getBot(tenantId: string): Telegraf<BotContext> | undefined {
    return this.bots.get(tenantId);
  }

  getActiveTenantIds(): string[] {
    return [...this.bots.keys()];
  }
}
