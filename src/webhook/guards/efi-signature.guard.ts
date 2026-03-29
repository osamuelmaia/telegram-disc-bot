import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentGateway } from '@prisma/client';
import { GatewayFactoryService } from '../../payment-gateway/gateway-factory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { EfiConfig } from '../../payment/gateways/efi/efi.config';

// =============================================================================
// EfiSignatureGuard — valida webhooks do Efí Bank por tenant
// =============================================================================
// Em produção: mTLS (sem secret necessário — segurança no nível de rede)
// Sandbox / fallback: header x-webhook-secret com valor armazenado nas credenciais do tenant
// =============================================================================

@Injectable()
export class EfiSignatureGuard implements CanActivate {
  private readonly logger = new Logger(EfiSignatureGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.params['tenantId'];

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenantId in webhook URL');
    }

    // Carrega credenciais do tenant para este gateway
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: PaymentGateway.EFI } },
    });

    if (!config || !config.active) {
      this.logger.warn(`[${tenantId}] EFI gateway not configured or inactive`);
      throw new UnauthorizedException('Gateway not configured for this tenant');
    }

    const credentials = JSON.parse(this.crypto.decrypt(config.credentials)) as EfiConfig;

    // Sem webhookSecret configurado → confia no mTLS (segurança de infraestrutura)
    if (!credentials.webhookSecret) {
      this.logger.debug(`[${tenantId}] No webhookSecret — trusting mTLS authentication`);
      return true;
    }

    const receivedSecret =
      (request.headers['x-webhook-secret'] as string | undefined) ??
      (request.headers['X-Webhook-Secret'] as string | undefined);

    if (!receivedSecret) {
      this.logger.warn(`[${tenantId}] Efí webhook rejected: missing x-webhook-secret header`);
      throw new UnauthorizedException('Missing webhook secret');
    }

    if (!timingSafeEqual(receivedSecret, credentials.webhookSecret)) {
      this.logger.warn(`[${tenantId}] Efí webhook rejected: invalid x-webhook-secret`);
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
