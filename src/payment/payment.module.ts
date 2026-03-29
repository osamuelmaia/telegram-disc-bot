import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EfiGateway } from './gateways/efi/efi.gateway';
import { StripeGateway } from './gateways/stripe/stripe.gateway';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { EFI_GATEWAY, STRIPE_GATEWAY } from './types/gateway.types';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [
    // Gateways registrados com tokens simbólicos para evitar acoplamento por nome de classe
    { provide: EFI_GATEWAY, useClass: EfiGateway },
    { provide: STRIPE_GATEWAY, useClass: StripeGateway },
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
