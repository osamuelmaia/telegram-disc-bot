import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from '../payment/payment.module';
import { CheckoutService } from './checkout.interface';
import { CheckoutServiceImpl } from './checkout.service';

@Module({
  imports: [PaymentModule, ConfigModule],
  providers: [
    {
      provide: CheckoutService,
      useClass: CheckoutServiceImpl,
    },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
