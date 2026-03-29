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
// WebhookController — Endpoints de recepção de webhooks
// =============================================================================
//
// Responsabilidades:
//   1. Extrair rawBody e headers
//   2. Delegar ao WebhookService (que orquestra persist → process)
//   3. SEMPRE retornar 200 após processamento (mesmo em erros de negócio)
//      → Erros de processamento são tratados internamente pelo WebhookService
//      → Apenas erros de validação de assinatura retornam 4xx (via Guards)
//
// Prefixo: /webhooks
// =============================================================================

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  // ── Efí Bank (Pix) ─────────────────────────────────────────────────────────

  /**
   * POST /webhooks/efi
   *
   * Configuração no painel Efí Bank:
   *   Minha Conta → API → Webhooks → URL de notificação
   *   Certificado mTLS (produção) ou EFI_WEBHOOK_SECRET (sandbox)
   *
   * O Efí envia eventos pix[] com o pagamento recebido.
   * A guarda valida a autenticidade antes de processar.
   */
  @Post('efi')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EfiSignatureGuard)
  async handleEfi(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = this.extractRawBody(req, 'efi');
    if (!rawBody) return;

    await this.webhookService.receive(PaymentGateway.EFI, rawBody, headers);
  }

  // ── Stripe (Assinatura recorrente) ─────────────────────────────────────────

  /**
   * POST /webhooks/stripe
   *
   * Configuração no painel Stripe:
   *   Developers → Webhooks → Add endpoint → https://seudominio.com/webhooks/stripe
   *
   * Eventos recomendados:
   *   ✓ checkout.session.completed
   *   ✓ customer.subscription.created
   *   ✓ customer.subscription.updated
   *   ✓ customer.subscription.deleted
   *   ✓ invoice.payment_succeeded
   *   ✓ invoice.payment_failed
   *
   * A guarda verifica a assinatura HMAC-SHA256 via stripe-signature header.
   * rawBody: true DEVE estar configurado no NestFactory para funcionar.
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StripeSignatureGuard)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = this.extractRawBody(req, 'stripe');
    if (!rawBody) return;

    await this.webhookService.receive(PaymentGateway.STRIPE, rawBody, headers);
  }

  // ── Admin: reprocessar eventos falhos ─────────────────────────────────────

  /**
   * POST /webhooks/retry/:id
   *
   * Reprocessa um WebhookEvent com status FAILED.
   * Proteger este endpoint com autenticação em produção (ex: @UseGuards(AdminGuard)).
   *
   * Uso: curl -X POST https://seudominio.com/webhooks/retry/cuid_do_evento
   */
  @Post('retry/:id')
  @HttpCode(HttpStatus.OK)
  async retryFailed(@Param('id') id: string): Promise<{ queued: boolean }> {
    this.logger.log(`Manual retry requested for webhook event: ${id}`);
    await this.webhookService.retryFailed(id);
    return { queued: true };
  }

  /**
   * GET /webhooks/failed
   *
   * Lista os últimos eventos com status FAILED para monitoramento.
   * Proteger em produção.
   */
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
