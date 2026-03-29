import { Injectable, NotImplementedException } from '@nestjs/common';
import { CardCheckoutResult, CheckoutService, PixChargeResult } from './checkout.interface';

/**
 * Stub do serviço de checkout.
 * Substituir por implementações reais (EfiGatewayService, StripeGatewayService)
 * quando o módulo de payment for implementado.
 */
@Injectable()
export class CheckoutServiceStub extends CheckoutService {
  createPixCharge(_telegramId: bigint, _productId: string): Promise<PixChargeResult> {
    throw new NotImplementedException(
      'Pix gateway not implemented yet. Implement EfiGatewayService.',
    );
  }

  createCardCheckout(_telegramId: bigint, _productId: string): Promise<CardCheckoutResult> {
    throw new NotImplementedException(
      'Card gateway not implemented yet. Implement StripeGatewayService.',
    );
  }
}
