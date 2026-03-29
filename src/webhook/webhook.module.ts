import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EfiGateway } from '../payment/gateways/efi/efi.gateway';
import { StripeGateway } from '../payment/gateways/stripe/stripe.gateway';
import { EFI_GATEWAY, STRIPE_GATEWAY } from '../payment/types/gateway.types';
import { EfiSignatureGuard } from './guards/efi-signature.guard';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';
import { PixWebhookProcessor } from './processors/pix.processor';
import { SubscriptionWebhookProcessor } from './processors/subscription.processor';
import { WebhookController } from './webhook.controller';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { WebhookService } from './webhook.service';

@Module({
  imports: [ConfigModule],
  controllers: [WebhookController],
  providers: [
    // Gateways
    { provide: EFI_GATEWAY, useClass: EfiGateway },
    { provide: STRIPE_GATEWAY, useClass: StripeGateway },
    // Guards
    EfiSignatureGuard,
    StripeSignatureGuard,
    // Processors — um por domínio de evento
    PixWebhookProcessor,
    SubscriptionWebhookProcessor,
    // Core
    WebhookIdempotencyService,
    WebhookService,
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
