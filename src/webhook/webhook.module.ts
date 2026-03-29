import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from '../payment/payment.module';
import { EfiSignatureGuard } from './guards/efi-signature.guard';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';
import { PixWebhookProcessor } from './processors/pix.processor';
import { SubscriptionWebhookProcessor } from './processors/subscription.processor';
import { WebhookController } from './webhook.controller';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { WebhookService } from './webhook.service';

@Module({
  imports: [
    ConfigModule,
    // PaymentModule expõe EFI_GATEWAY e STRIPE_GATEWAY usados pelo WebhookService
    PaymentModule,
  ],
  controllers: [WebhookController],
  providers: [
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
