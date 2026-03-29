import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { PaymentGateway } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { StripeConfig } from '../../payment/gateways/stripe/stripe.config';

// =============================================================================
// StripeSignatureGuard — valida webhooks do Stripe por tenant
// =============================================================================
// Lê o webhookSecret das credenciais criptografadas do tenant no banco.
// Verifica a assinatura HMAC-SHA256 do Stripe usando o rawBody.
// =============================================================================

const STRIPE_TIMESTAMP_TOLERANCE_SECONDS = 300;

@Injectable()
export class StripeSignatureGuard implements CanActivate {
  private readonly logger = new Logger(StripeSignatureGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const tenantId = request.params['tenantId'];

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenantId in webhook URL');
    }

    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: PaymentGateway.STRIPE } },
    });

    if (!config || !config.active) {
      this.logger.warn(`[${tenantId}] Stripe gateway not configured or inactive`);
      throw new UnauthorizedException('Gateway not configured for this tenant');
    }

    const credentials = JSON.parse(this.crypto.decrypt(config.credentials)) as StripeConfig;

    const signature = request.headers['stripe-signature'];
    if (!signature) {
      this.logger.warn(`[${tenantId}] Stripe webhook rejected: missing stripe-signature header`);
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.error(`[${tenantId}] Stripe webhook rejected: rawBody empty`);
      throw new UnauthorizedException('Raw body unavailable for signature verification');
    }

    try {
      const stripe = new Stripe(credentials.secretKey, {
        apiVersion: credentials.apiVersion,
        typescript: true,
      });

      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        credentials.webhookSecret,
        STRIPE_TIMESTAMP_TOLERANCE_SECONDS,
      );

      return true;
    } catch (err) {
      const safeMessage = err instanceof Error ? err.message.slice(0, 120) : 'unknown';
      this.logger.warn(
        `[${tenantId}] Stripe webhook rejected: signature verification failed — ${safeMessage}`,
      );
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
  }
}
