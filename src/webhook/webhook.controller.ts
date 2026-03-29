import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentGateway } from '@prisma/client';
import { WebhookService } from './webhook.service';
import { EfiSignatureGuard } from './guards/efi-signature.guard';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';

// =============================================================================
// WebhookController — Endpoints multi-tenant de recepção de webhooks
// =============================================================================
//
// Cada tenant configura sua URL de webhook incluindo o próprio tenantId:
//   EFI:    POST /webhooks/:tenantId/efi
//   Stripe: POST /webhooks/:tenantId/stripe
//
// SEMPRE retorna 200 após processamento — erros de negócio são capturados
// internamente. Apenas erros de assinatura retornam 4xx.
// =============================================================================

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  // ── Efí Bank (Pix) ─────────────────────────────────────────────────────────

  @Post(':tenantId/efi')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EfiSignatureGuard)
  async handleEfi(
    @Param('tenantId') tenantId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = this.extractRawBody(req, 'efi');
    if (!rawBody) return;

    await this.webhookService.receive(tenantId, PaymentGateway.EFI, rawBody, headers);
  }

  // ── Stripe (Assinatura recorrente) ─────────────────────────────────────────

  @Post(':tenantId/stripe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StripeSignatureGuard)
  async handleStripe(
    @Param('tenantId') tenantId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = this.extractRawBody(req, 'stripe');
    if (!rawBody) return;

    await this.webhookService.receive(tenantId, PaymentGateway.STRIPE, rawBody, headers);
  }

  // ── Admin: reprocessar eventos falhos ─────────────────────────────────────

  @Post('retry/:id')
  @HttpCode(HttpStatus.OK)
  async retryFailed(@Param('id') id: string): Promise<{ queued: boolean }> {
    this.logger.log(`Manual retry requested for webhook event: ${id}`);
    await this.webhookService.retryFailed(id);
    return { queued: true };
  }

  @Get('failed')
  async listFailed() {
    return this.webhookService.findFailed();
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private extractRawBody(req: RawBodyRequest<Request>, source: string): Buffer | null {
    if (!req.rawBody || req.rawBody.length === 0) {
      this.logger.error(
        `[${source}] rawBody is empty. ` +
          'Ensure NestFactory.create(AppModule, { rawBody: true }) in main.ts.',
      );
      return null;
    }
    return req.rawBody;
  }
}
