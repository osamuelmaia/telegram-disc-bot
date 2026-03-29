import { Logger, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import {
  CancelSubscriptionInput,
  CreatePixChargeInput,
  CreateSubscriptionInput,
  IPaymentGateway,
  ParsedWebhookEvent,
  PixChargeOutput,
  PixChargeStatus,
  PixChargeStatusOutput,
  SubscriptionOutput,
  SubscriptionStatusOutput,
} from '../../interfaces/payment-gateway.interface';
import { EFI_API_URLS, EfiConfig } from './efi.config';
import {
  EfiAccessTokenResponse,
  EfiCobResponse,
  EfiCobStatus,
  EfiCreateCobRequest,
  EfiQrCodeResponse,
  EfiWebhookPayload,
} from './efi.types';

// =============================================================================
// EfiGateway — Implementação da API Pix do Efí Bank
// =============================================================================
// Suporta: criação de cobrança, consulta de status, cancelamento e webhook.
// NÃO suporta assinaturas (Efí não tem recorrência nativa — use Stripe).
// =============================================================================

export class EfiGateway implements IPaymentGateway {
  readonly gatewayName = 'efi';

  private readonly logger = new Logger(EfiGateway.name);
  private readonly config: EfiConfig;
  private readonly http: AxiosInstance;

  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: EfiConfig) {
    this.config = config;

    const baseURL = this.config.sandbox ? EFI_API_URLS.sandbox : EFI_API_URLS.production;

    // Em produção, configurar mTLS com certificado .p12 da Efí Bank
    const httpsAgent =
      !this.config.sandbox && this.config.certificate
        ? new https.Agent({
            pfx: Buffer.from(this.config.certificate, 'base64'),
            passphrase: '',
            rejectUnauthorized: true,
          })
        : undefined;

    this.http = axios.create({
      baseURL,
      httpsAgent,
      timeout: 15_000,
    });
  }

  // ── Pix ─────────────────────────────────────────────────────────────────────

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeOutput> {
    const token = await this.getAccessToken();

    const body: EfiCreateCobRequest = {
      calendario: { expiracao: input.expiresInSeconds ?? 3600 },
      valor: { original: input.amount.toFixed(2) },
      chave: this.config.pixKey,
      solicitacaoPagador: input.description,
      ...(input.debtor && {
        devedor: { cpf: input.debtor.cpf, nome: input.debtor.name },
      }),
    };

    // Usa txid personalizado se fornecido (PUT), senão deixa o gateway gerar (POST)
    const response = input.txid
      ? await this.http.put<EfiCobResponse>(`/v2/cob/${input.txid}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        })
      : await this.http.post<EfiCobResponse>('/v2/cob', body, {
          headers: { Authorization: `Bearer ${token}` },
        });

    const cob = response.data;

    // Busca o QR Code como imagem
    let pixQrCodeBase64: string | null = null;
    let pixQrCodeUrl: string | null = null;

    try {
      const qr = await this.getQrCode(cob.loc.id, token);
      pixQrCodeBase64 = qr.imagemQrcode;
      pixQrCodeUrl = qr.linkVisualizacao;
    } catch (err) {
      this.logger.warn(`Could not fetch QR Code image for txid ${cob.txid}: ${err}`);
    }

    const expiracao = cob.calendario.expiracao;
    const criacao = new Date(cob.calendario.criacao);
    const expiresAt = new Date(criacao.getTime() + expiracao * 1000);

    return {
      txid: cob.txid,
      gatewayOrderId: cob.txid,
      pixCopyPaste: cob.pixCopiaECola,
      pixQrCodeBase64,
      pixQrCodeUrl,
      expiresAt,
      status: this.mapCobStatus(cob.status),
    };
  }

  async getPixChargeStatus(txid: string): Promise<PixChargeStatusOutput> {
    const token = await this.getAccessToken();

    const response = await this.http.get<EfiCobResponse>(`/v2/cob/${txid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const cob = response.data;
    const lastPix = cob.pix?.[cob.pix.length - 1];

    return {
      txid: cob.txid,
      status: this.mapCobStatus(cob.status),
      paidAt: lastPix ? new Date(lastPix.horario) : null,
      endToEndId: lastPix?.endToEndId ?? null,
      amount: parseFloat(cob.valor.original),
    };
  }

  async cancelPixCharge(txid: string): Promise<void> {
    const token = await this.getAccessToken();

    // Efí cancela via PATCH com status REMOVIDA_PELO_USUARIO_RECEBEDOR
    await this.http.patch(
      `/v2/cob/${txid}`,
      { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  // ── Assinatura (não suportado — use StripeGateway) ────────────────────────

  createSubscription(_input: CreateSubscriptionInput): Promise<SubscriptionOutput> {
    throw new Error('EfiGateway does not support subscriptions. Use StripeGateway.');
  }

  getSubscriptionStatus(_id: string): Promise<SubscriptionStatusOutput> {
    throw new Error('EfiGateway does not support subscriptions. Use StripeGateway.');
  }

  cancelSubscription(_input: CancelSubscriptionInput): Promise<void> {
    throw new Error('EfiGateway does not support subscriptions. Use StripeGateway.');
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  parseWebhookEvent(rawBody: Buffer | string, headers: Record<string, string>): ParsedWebhookEvent {
    // O Efí Bank não usa assinatura HMAC por padrão — usa mTLS para autenticar o sender.
    // Se o webhookSecret estiver configurado, valida o header x-webhook-secret.
    if (this.config.webhookSecret) {
      const receivedSecret = headers['x-webhook-secret'] ?? headers['X-Webhook-Secret'];
      if (receivedSecret !== this.config.webhookSecret) {
        throw new UnauthorizedException('Invalid Efí webhook secret');
      }
    }

    const body: EfiWebhookPayload =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : JSON.parse(rawBody.toString('utf-8'));

    // O Efí pode enviar múltiplos pagamentos em um único POST.
    // Processamos apenas o primeiro para simplificar — em produção, iterar sobre todos.
    const pixPayment = body.pix?.[0];

    if (!pixPayment) {
      return {
        eventId: `efi-empty-${Date.now()}`,
        eventType: 'unknown',
        data: { type: 'unknown' },
      };
    }

    return {
      // Efí não tem um ID de evento dedicado — usamos o endToEndId como chave de idempotência
      eventId: pixPayment.endToEndId,
      eventType: 'pix.paid',
      data: {
        type: 'pix.paid',
        txid: pixPayment.txid,
        endToEndId: pixPayment.endToEndId,
        amount: parseFloat(pixPayment.valor),
        paidAt: new Date(pixPayment.horario),
      },
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async getQrCode(locId: number, token: string): Promise<EfiQrCodeResponse> {
    const response = await this.http.get<EfiQrCodeResponse>(`/v2/loc/${locId}/qrcode`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  /**
   * Obtém ou renova o token OAuth2.
   * O token tem validade de 3600s; renovamos com 60s de margem.
   */
  private async getAccessToken(): Promise<string> {
    const now = new Date();
    const margin = 60_000; // 60 segundos antes de expirar

    if (this.accessToken && this.tokenExpiresAt) {
      if (this.tokenExpiresAt.getTime() - now.getTime() > margin) {
        return this.accessToken;
      }
    }

    const baseURL = this.config.sandbox ? EFI_API_URLS.sandbox : EFI_API_URLS.production;
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    const response = await axios.post<EfiAccessTokenResponse>(
      `${baseURL}/oauth/token`,
      { grant_type: 'client_credentials' },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      },
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = new Date(now.getTime() + response.data.expires_in * 1000);

    this.logger.debug(`Efí access token renewed. Expires at: ${this.tokenExpiresAt.toISOString()}`);

    return this.accessToken;
  }

  private mapCobStatus(status: EfiCobStatus): PixChargeStatus {
    const map: Record<EfiCobStatus, PixChargeStatus> = {
      ATIVA: 'ACTIVE',
      CONCLUIDA: 'COMPLETED',
      REMOVIDA_PELO_USUARIO_RECEBEDOR: 'REMOVED_BY_RECEIVER',
      REMOVIDA_PELO_PSP: 'REMOVED_BY_PSP',
    };
    return map[status];
  }
}
