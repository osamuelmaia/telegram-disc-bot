import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EfiGateway } from './gateways/efi/efi.gateway';
import { StripeGateway } from './gateways/stripe/stripe.gateway';
import { PaymentService } from './payment.service';
import { EFI_GATEWAY, STRIPE_GATEWAY } from './types/gateway.types';

// Webhooks foram movidos para WebhookModule (src/webhook/) para separação de responsabilidades.
// PaymentModule expõe apenas: gateways + PaymentService (criação de cobranças e assinaturas).

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: EFI_GATEWAY, useClass: EfiGateway },
    { provide: STRIPE_GATEWAY, useClass: StripeGateway },
    PaymentService,
  ],
  exports: [PaymentService, EFI_GATEWAY, STRIPE_GATEWAY],
})
export class PaymentModule {}
