import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentGateway } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FieldEncryptionService } from '../common/crypto/field-encryption.service';
import { IPaymentGateway } from '../payment/interfaces/payment-gateway.interface';
import { EfiGateway } from '../payment/gateways/efi/efi.gateway';
import { EfiConfig } from '../payment/gateways/efi/efi.config';
import { StripeGateway } from '../payment/gateways/stripe/stripe.gateway';
import { StripeConfig } from '../payment/gateways/stripe/stripe.config';

// =============================================================================
// GatewayFactoryService — cria instâncias de gateways por tenant
// =============================================================================
// Lê PaymentGatewayConfig do banco, descriptografa as credenciais e retorna
// uma instância pronta do gateway. Resultados ficam em cache por tenant+tipo
// para evitar reads repetidos no DB.
// Invalide o cache quando as credenciais forem atualizadas.
// =============================================================================

@Injectable()
export class GatewayFactoryService {
  private readonly logger = new Logger(GatewayFactoryService.name);
  private readonly cache = new Map<string, IPaymentGateway>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async getGateway(tenantId: string, type: PaymentGateway): Promise<IPaymentGateway> {
    const cacheKey = `${tenantId}:${type}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Tenta config específica do tenant
    const tenantConfig = await this.prisma.paymentGatewayConfig.findUnique({
      where: { tenantId_gateway: { tenantId, gateway: type } },
      select: { credentials: true, active: true },
    });

    // 2. Fallback para config centralizada da plataforma
    const platformConfig =
      !tenantConfig?.active
        ? await this.prisma.platformGatewayConfig.findUnique({
            where: { gateway: type },
            select: { credentials: true, active: true },
          })
        : null;

    const resolved = tenantConfig?.active ? tenantConfig : platformConfig?.active ? platformConfig : null;

    if (!resolved) {
      throw new NotFoundException(`No active ${type} gateway configured`);
    }

    const credentials = JSON.parse(this.crypto.decrypt(resolved.credentials));
    const gateway = this.buildGateway(type, credentials);

    this.cache.set(cacheKey, gateway);
    this.logger.debug(`[${tenantId}] ${type} gateway resolved (${tenantConfig?.active ? 'tenant' : 'platform'})`);

    return gateway;
  }

  invalidate(tenantId: string, type?: PaymentGateway): void {
    if (type) {
      this.cache.delete(`${tenantId}:${type}`);
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.cache.delete(key);
        }
      }
    }
    this.logger.debug(`[${tenantId}] Gateway cache invalidated (type=${type ?? 'all'})`);
  }

  private buildGateway(type: PaymentGateway, credentials: unknown): IPaymentGateway {
    switch (type) {
      case PaymentGateway.EFI:
        return new EfiGateway(credentials as EfiConfig);
      case PaymentGateway.STRIPE:
        return new StripeGateway(credentials as StripeConfig);
      default:
        throw new Error(`Unsupported gateway type: ${type}`);
    }
  }
}
