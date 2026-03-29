import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { AccessModule } from '../access/access.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { BotUpdate } from './bot.update';
import { BotEventsService } from './bot-events.service';
import { BuyPixScene } from './scenes/buy-pix.scene';
import { BuyCardScene } from './scenes/buy-card.scene';

// =============================================================================
// BotModule
// =============================================================================
// Registra o bot Telegraf com:
//   - Token via ConfigService (variável TELEGRAM_BOT_TOKEN)
//   - Middleware de session (obrigatório para scenes funcionarem)
//   - Scenes: BuyPixScene e BuyCardScene
//   - BotUpdate: todos os handlers de comando e action
//
// Depende de:
//   - UserModule    — upsert e consulta de usuários
//   - ProductModule — listagem e detalhe de produtos
//   - AccessModule  — consulta de acessos ativos
//   - CheckoutModule — abstração dos gateways de pagamento
// =============================================================================

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        token: config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
        middlewares: [
          // session() é necessário para persistir estado entre interações nas scenes.
          // Em produção, substituir pelo adapter de Redis ou banco:
          //   session({ store: new RedisSession(...) })
          session(),
        ],
      }),
      inject: [ConfigService],
    }),
    UserModule,
    ProductModule,
    AccessModule,
    CheckoutModule,
  ],
  providers: [
    BotUpdate,
    BotEventsService,
    BuyPixScene,
    BuyCardScene,
  ],
})
export class BotModule {}
