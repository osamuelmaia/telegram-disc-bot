export class CreateSubscriptionDto {
  userId: string;
  productId: string;
  telegramId: bigint;

  /**
   * URLs de retorno após o checkout externo.
   * Devem apontar para endpoints do bot ou landing page.
   */
  successUrl: string;
  cancelUrl: string;
}
