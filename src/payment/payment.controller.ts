import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentGateway } from '@prisma/client';
import { PaymentService } from './payment.service';

// =============================================================================
// PaymentController — Endpoints de webhook dos gateways
// =============================================================================
// IMPORTANTE: para que a verificação de assinatura do Stripe funcione,
// a aplicação DEVE ser iniciada com rawBody: true no NestFactory:
//
//   const app = await NestFactory.create(AppModule, { rawBody: true });
//
// O corpo bruto (Buffer) é necessário para stripe.webhooks.constructEvent().
// =============================================================================

@Controller('webhooks')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Webhook do Efí Bank (Pix).
   *
   * Configurar em: Painel Efí → Minha Conta → API → Webhooks
   * URL: https://seudominio.com/webhooks/efi
   *
   * O Efí autentica via mTLS em produção.
   * Em sandbox, autenticação via x-webhook-secret (se EFI_WEBHOOK_SECRET configurado).
   */
  @Post('efi')
  @HttpCode(HttpStatus.OK)
  async handleEfiWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('Raw body not available. Ensure rawBody: true in NestFactory.');
    }

    this.logger.debug(`Efí webhook received: ${rawBody.toString('utf-8').slice(0, 200)}`);

    await this.paymentService.processWebhook(PaymentGateway.EFI, rawBody, headers);
  }

  /**
   * Webhook do Stripe (assinaturas e pagamentos recorrentes).
   *
   * Configurar em: Painel Stripe → Developers → Webhooks → Add endpoint
   * URL: https://seudominio.com/webhooks/stripe
   * Eventos a escutar:
   *   - checkout.session.completed
   *   - customer.subscription.created
   *   - customer.subscription.updated
   *   - customer.subscription.deleted
   *   - invoice.payment_succeeded
   *   - invoice.payment_failed
   *
   * A assinatura HMAC-SHA256 é verificada via stripe-signature header.
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('Raw body not available. Ensure rawBody: true in NestFactory.');
    }

    if (!headers['stripe-signature']) {
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    this.logger.debug(`Stripe webhook received: type=${headers['stripe-signature']?.slice(0, 30)}`);

    await this.paymentService.processWebhook(PaymentGateway.STRIPE, rawBody, headers);
  }
}
