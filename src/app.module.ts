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
    TenantModule,
    AuthModule,
    EndUserModule,
    ProductModule,
    BotRegistryModule,
    WebhookModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
