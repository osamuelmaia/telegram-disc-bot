// =============================================================================
// Tipos da API Pix do Efí Bank (ex-Gerencianet)
// Referência: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas
// =============================================================================

// ── OAuth2 ────────────────────────────────────────────────────────────────────

export interface EfiAccessTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

// ── Cobrança imediata (POST /v2/cob) ─────────────────────────────────────────

export interface EfiCreateCobRequest {
  calendario: {
    /** Validade em segundos a partir da criação */
    expiracao: number;
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
  };
  valor: {
    /** Valor com 2 casas decimais como string, ex: "99.90" */
    original: string;
  };
  /** Chave Pix do recebedor (CPF, CNPJ, email, celular ou aleatória) */
  chave: string;
  solicitacaoPagador?: string;
  infoAdicionais?: Array<{
    nome: string;
    valor: string;
  }>;
}

export type EfiCobStatus =
  | 'ATIVA'
  | 'CONCLUIDA'
  | 'REMOVIDA_PELO_USUARIO_RECEBEDOR'
  | 'REMOVIDA_PELO_PSP';

export interface EfiCobResponse {
  status: EfiCobStatus;
  calendario: {
    criacao: string;    // ISO 8601
    expiracao: number;  // segundos
  };
  txid: string;
  revisao: number;
  loc: {
    id: number;
    location: string;
    tipoCob: 'cob' | 'cobv';
    criacao: string;
  };
  location: string;
  /** Código EMV copia-e-cola */
  pixCopiaECola: string;
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
  };
  valor: {
    original: string;
  };
  chave: string;
  solicitacaoPagador?: string;
  /** Pagamentos recebidos (presente apenas se status = CONCLUIDA) */
  pix?: EfiPixPagamento[];
}

export interface EfiPixPagamento {
  endToEndId: string;
  txid: string;
  valor: string;
  /** ISO 8601 */
  horario: string;
  infoPagador?: string;
}

// ── QR Code (GET /v2/loc/{id}/qrcode) ────────────────────────────────────────

export interface EfiQrCodeResponse {
  /** Imagem PNG do QR Code em base64 */
  imagemQrcode: string;
  /** Texto copia-e-cola (mesmo que pixCopiaECola da cobrança) */
  qrcode: string;
  linkVisualizacao: string;
}

// ── Webhook payload ───────────────────────────────────────────────────────────

/**
 * Payload enviado pelo Efí Bank ao URL de webhook configurado.
 * O Efí envia múltiplos pagamentos em um único POST quando há lote.
 */
export interface EfiWebhookPayload {
  pix?: EfiPixPagamento[];
}
