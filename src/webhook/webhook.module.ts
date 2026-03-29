import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { EfiSignatureGuard } from './guards/efi-signature.guard';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';
import { PixWebhookProcessor } from './processors/pix.processor';
import { SubscriptionWebhookProcessor } from './processors/subscription.processor';
import { WebhookController } from './webhook.controller';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { WebhookService } from './webhook.service';

@Module({
  imports: [WalletModule],
  controllers: [WebhookController],
  providers: [
    // Guards
    EfiSignatureGuard,
    StripeSignatureGuard,
    // Processors
    PixWebhookProcessor,
    SubscriptionWebhookProcessor,
    // Core
    WebhookIdempotencyService,
    WebhookService,
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
