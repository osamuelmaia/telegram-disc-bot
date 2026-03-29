export interface EfiConfig {
  clientId: string;
  clientSecret: string;
  /** Chave Pix do recebedor (conta Efí Bank) */
  pixKey: string;
  /** true = produção, false = sandbox */
  sandbox: boolean;
  /**
   * Certificado mTLS em base64 ou path do arquivo .p12/.pem.
   * Obrigatório em produção. Em sandbox pode ser omitido.
   */
  certificate?: string;
  /** Webhook secret para validação HMAC (se configurado no painel Efí) */
  webhookSecret?: string;
}

export const efiConfigFromEnv = (): EfiConfig => ({
  clientId: process.env.EFI_CLIENT_ID ?? '',
  clientSecret: process.env.EFI_CLIENT_SECRET ?? '',
  pixKey: process.env.EFI_PIX_KEY ?? '',
  sandbox: process.env.EFI_SANDBOX === 'true',
  certificate: process.env.EFI_CERTIFICATE_BASE64,
  webhookSecret: process.env.EFI_WEBHOOK_SECRET,
});

export const EFI_API_URLS = {
  production: 'https://pix.api.efipay.com.br',
  sandbox: 'https://pix-h.api.efipay.com.br',
} as const;
