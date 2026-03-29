import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { EndUserModule } from './end-user/end-user.module';
import { ProductModule } from './product/product.module';
import { BotRegistryModule } from './bot-registry/bot-registry.module';
import { AdminModule } from './admin/admin.module';
import { WebhookModule } from './webhook/webhook.module';
import { PaymentGatewayModule } from './payment-gateway/payment-gateway.module';
import { OrderModule } from './order/order.module';
import { WalletModule } from './wallet/wallet.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CryptoModule,
    PaymentGatewayModule,
    TenantModule,
    AuthModule,
    EndUserModule,
    ProductModule,
    OrderModule,
    WalletModule,
    BotRegistryModule,
    WebhookModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
