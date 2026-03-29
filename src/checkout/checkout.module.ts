import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.interface';
import { CheckoutServiceStub } from './checkout.service';

@Module({
  providers: [
    {
      provide: CheckoutService,
      useClass: CheckoutServiceStub,
      // Trocar por: useClass: PaymentGatewayService
      // quando o módulo de payment for implementado.
    },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
