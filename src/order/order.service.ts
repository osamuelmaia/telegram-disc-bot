import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentGateway } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayFactoryService } from '../payment-gateway/gateway-factory.service';

// =============================================================================
// OrderService — cria e gerencia pedidos de pagamento por tenant
// =============================================================================

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayFactory: GatewayFactoryService,
  ) {}

  /**
   * Cria um pedido Pix para um produto ONE_TIME.
   * Gera a cobrança no gateway EFI do tenant e persiste os dados do QR Code.
   */
  async createPixOrder(
    tenantId: string,
    endUserId: string,
    productId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, active: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found for tenant ${tenantId}`);
    }

    // Carrega taxa da plataforma
    const platformConfig = await this.prisma.platformConfig.findFirst();
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const feePercent = (tenant.platformFeePercent ?? platformConfig?.defaultFeePercent ?? new Decimal('0.05')) as Decimal;

    const grossAmount = new Decimal(product.price.toString());
    const feeAmount = grossAmount.mul(feePercent).toDecimalPlaces(2);
    const netAmount = grossAmount.minus(feeAmount);

    // Cria o pedido no banco primeiro (PENDING)
    const order = await this.prisma.order.create({
      data: {
        tenantId,
        endUserId,
        productId,
        status: 'PENDING',
        gateway: PaymentGateway.EFI,
        amount: grossAmount,
        platformFeeAmount: feeAmount,
        netAmount,
        currency: product.currency,
      },
    });

    try {
      const gateway = await this.gatewayFactory.getGateway(tenantId, PaymentGateway.EFI);

      // txid para Efí: max 35 chars, somente alfanumérico
      const txid = order.id.replace(/-/g, '').substring(0, 35);

      const charge = await gateway.createPixCharge({
        txid,
        amount: grossAmount.toNumber(),
        description: product.name,
        expiresInSeconds: 3600,
      });

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayOrderId: charge.gatewayOrderId,
          gatewayTxid: charge.txid,
          pixCopyPaste: charge.pixCopyPaste,
          pixQrCodeBase64: charge.pixQrCodeBase64,
          pixQrCodeUrl: charge.pixQrCodeUrl,
          expiresAt: charge.expiresAt,
        },
      });

      this.logger.log(
        `[${tenantId}] Pix order ${order.id} created — txid=${charge.txid}`,
      );

      return updated;
    } catch (err) {
      // Marca o pedido como falhou antes de relançar
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      }).catch(() => null);

      this.logger.error(`[${tenantId}] Failed to create Pix charge for order ${order.id}: ${err}`);
      throw err;
    }
  }

  async findById(tenantId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });
  }
}
