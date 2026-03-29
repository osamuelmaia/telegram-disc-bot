import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';

// =============================================================================
// StripeSignatureGuard
// =============================================================================
// Verifica a assinatura HMAC-SHA256 de webhooks do Stripe.
//
// O Stripe assina cada evento com o STRIPE_WEBHOOK_SECRET usando HMAC-SHA256.
// A verificação usa o corpo bruto da requisição (rawBody) — qualquer
// transformação do body antes deste ponto invalida a assinatura.
//
// Pré-requisito no main.ts:
//   const app = await NestFactory.create(AppModule, { rawBody: true });
//
// Se a assinatura for inválida:
//   - Retorna 401 Unauthorized
//   - O Stripe NÃO vai retentar eventos com resposta 4xx — isso é intencional,
//     pois indica que o evento foi adulterado ou o secret está incorreto.
// =============================================================================

// Tolerância de diferença de clock entre Stripe e servidor (5 minutos)
const STRIPE_TIMESTAMP_TOLERANCE_SECONDS = 300;

@Injectable()
export class StripeSignatureGuard implements CanActivate {
  private readonly logger = new Logger(StripeSignatureGuard.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    this.webhookSecret = config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const signature = request.headers['stripe-signature'];
    if (!signature) {
      this.logger.warn('Stripe webhook rejected: missing stripe-signature header');
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.error(
        'Stripe webhook rejected: rawBody is empty. ' +
          'Ensure NestFactory.create(AppModule, { rawBody: true }) in main.ts',
      );
      throw new UnauthorizedException('Raw body unavailable for signature verification');
    }

    try {
      // constructEvent verifica assinatura + tolerância de timestamp
      this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
        STRIPE_TIMESTAMP_TOLERANCE_SECONDS,
      );

      return true;
    } catch (err) {
      // Não loga o erro completo — pode conter fragmentos do payload
      const safeMessage = err instanceof Error ? err.message.slice(0, 120) : 'unknown';
      this.logger.warn(`Stripe webhook rejected: signature verification failed — ${safeMessage}`);
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
  }
}
