import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BotRegistryModule } from '../bot-registry/bot-registry.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [BotRegistryModule, WalletModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
