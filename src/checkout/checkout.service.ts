import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { PaymentGateway } from '@prisma/client';
import {
  CardCheckoutResult,
  CheckoutService,
  PixChargeResult,
} from './checkout.interface';

// =============================================================================
// CheckoutService — Implementação real (substitui o stub)
// =============================================================================
// Orquestra a criação de cobranças e assinaturas via PaymentService.
// É a única dependência do BotModule em relação ao domínio de pagamento.
// =============================================================================

@Injectable()
export class CheckoutServiceImpl extends CheckoutService {
  private readonly logger = new Logger(CheckoutServiceImpl.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async createPixCharge(telegramId: bigint, productId: string): Promise<PixChargeResult> {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      throw new NotFoundException(
        `User with telegramId ${telegramId} not found. Ensure /start was called first.`,
      );
    }

    this.logger.log(`Creating Pix charge: user=${user.id} product=${productId}`);

    const result = await this.paymentService.createPixCharge({
      userId: user.id,
      productId,
      telegramId,
      gatewayType: PaymentGateway.EFI,
      debtor: user.cpf && user.firstName
        ? { cpf: user.cpf, name: user.firstName }
        : undefined,
    });

    return {
      orderId: result.orderId,
      pixCopyPaste: result.pixCopyPaste,
      pixQrCodeBase64: result.pixQrCodeBase64,
      pixQrCodeUrl: result.pixQrCodeUrl,
      expiresAt: result.expiresAt,
    };
  }

  async createCardCheckout(telegramId: bigint, productId: string): Promise<CardCheckoutResult> {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      throw new NotFoundException(
        `User with telegramId ${telegramId} not found. Ensure /start was called first.`,
      );
    }

    this.logger.log(`Creating card checkout: user=${user.id} product=${productId}`);

    // URLs de retorno configuráveis via .env
    const baseUrl = this.config.getOrThrow<string>('APP_BASE_URL');

    const result = await this.paymentService.createSubscription({
      userId: user.id,
      productId,
      telegramId,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
    });

    return {
      subscriptionId: result.subscriptionId,
      checkoutUrl: result.checkoutUrl,
    };
  }
}
