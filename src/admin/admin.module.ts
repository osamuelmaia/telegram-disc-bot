import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { PaymentModule } from '../payment/payment.module';
import { ProductModule } from '../product/product.module';
import { WebhookModule } from '../webhook/webhook.module';
import { AdminGuard } from './admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductModule, AccessModule, PaymentModule, WebhookModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
