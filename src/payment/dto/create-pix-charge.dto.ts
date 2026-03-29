export class CreatePixChargeDto {
  userId: string;
  productId: string;
  telegramId: bigint;

  /** Valor em reais. Obtido do Product.price se omitido. */
  amount?: number;

  /** Tempo de validade em segundos. Padrão: 3600 */
  expiresInSeconds?: number;

  debtor?: {
    name: string;
    /** Somente dígitos */
    cpf: string;
  };
}
