import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WalletModule } from '../wallet/wallet.module';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [WalletModule, CryptoModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
