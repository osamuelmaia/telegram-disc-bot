import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, WebhookEvent, WebhookStatus } from '@prisma/client';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.type';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IPaymentGateway, WebhookEventType } from '../payment/interfaces/payment-gateway.interface';
import { EFI_GATEWAY, STRIPE_GATEWAY } from '../payment/types/gateway.types';
import { PrismaService } from '../prisma/prisma.service';
import { IWebhookProcessor } from './processors/webhook-processor.interface';
import { PixWebhookProcessor } from './processors/pix.processor';
import { SubscriptionWebhookProcessor } from './processors/subscription.processor';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

// =============================================================================
// WebhookService — Pipeline de processamento de webhooks
// =============================================================================
//
// Pipeline de execução para cada requisição recebida:
//
//   1. PERSIST    → salva o payload bruto com status PROCESSING (idempotência)
//   2. SKIP?      → se duplicata já processada, retorna sem fazer nada
//   3. PARSE      → gateway.parseWebhookEvent() normaliza o evento
//   4. DISPATCH   → encontra o processor responsável pelo tipo de evento
//   5. PROCESS    → processor.handle() atualiza o banco e emite eventos
//   6. MARK       → marca PROCESSED ou FAILED com mensagem de erro
//
// Princípio de retorno HTTP:
//   - Erros de validação (assinatura inválida) → lançar exceção → 401/400
//   - Erros de processamento → capturar, marcar FAILED, retornar 200
//     (o gateway não deve retentar eventos com falha de processamento;
//      o reprocessamento é feito via retryFailed())
// =============================================================================

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly processors: IWebhookProcessor[];

  constructor(
    private readonly idempotency: WebhookIdempotencyService,
    private readonly prisma: PrismaService,
    private readonly pixProcessor: PixWebhookProcessor,
    private readonly subscriptionProcessor: SubscriptionWebhookProcessor,
    @Inject(EFI_GATEWAY) private readonly efiGateway: IPaymentGateway,
    @Inject(STRIPE_GATEWAY) private readonly stripeGateway: IPaymentGateway,
  ) {
    this.processors = [pixProcessor, subscriptionProcessor];
  }

  /**
   * Ponto de entrada para todos os webhooks recebidos.
   * Persiste o evento antes de qualquer processamento.
   * Erros de processamento são capturados, logados e marcados como FAILED.
   * Erros de validação (assinatura) propagam para o controller (retornam 4xx).
   */
  async receive(
    gateway: PaymentGateway,
    rawBody: Buffer,
    headers: Record<string, string>,
  ): Promise<void> {
    const gatewayInstance = this.resolveGateway(gateway);

    // STEP 1: Parseia o evento (validação de assinatura ocorreu no Guard)
    // parseWebhookEvent aqui é usado apenas para extrair o eventId e eventType
    // antes de persistir — se falhar, o evento não foi processado.
    let parsed: ReturnType<IPaymentGateway['parseWebhookEvent']>;

    try {
      parsed = gatewayInstance.parseWebhookEvent(rawBody, headers);
    } catch (err) {
      // Erro de assinatura aqui (segunda verificação após guard) — propaga 4xx
      throw err;
    }

    // STEP 2: Persiste o payload bruto e adquire lock de processamento
    // O payload raw é armazenado — importante para auditoria e replay
    const rawPayloadForStorage = this.sanitizeForStorage(rawBody);

    const { skip, record } = await this.idempotency.tryAcquire(
      gateway,
      parsed.eventId,
      parsed.eventType,
      rawPayloadForStorage,
    );

    if (skip || !record) {
      return; // Evento já processado ou em processamento por outra instância
    }

    // STEP 3: Dispatch para o processor responsável
    await this.dispatch(
      parsed.eventType,
      () => this.resolveProcessor(parsed.eventType)?.handle(parsed, record.id),
      record,
    );
  }

  /**
   * Reprocessa um evento previamente marcado como FAILED.
   * Usado por endpoints administrativos ou scripts de retry.
   */
  async retryFailed(webhookEventId: string): Promise<void> {
    const record = await this.idempotency.reacquireForRetry(webhookEventId);

    if (!record) {
      this.logger.warn(`retryFailed: event ${webhookEventId} not found or not in FAILED status`);
      return;
    }

    const gateway = this.resolveGateway(record.gateway);
    const payload = record.payload as Record<string, unknown>;

    // Reconstrói o evento normalizado a partir do payload armazenado
    // (sem reverificar a assinatura — já foi validado na recepção original)
    const parsed = this.rebuildParsedEvent(record);

    await this.dispatch(
      parsed.eventType,
      () => this.resolveProcessor(parsed.eventType)?.handle(parsed, record.id),
      record,
    );
  }

  /**
   * Lista eventos com status FAILED para monitoramento, com paginação.
   */
  async findFailed(pagination: PaginationDto = new PaginationDto()): Promise<PaginatedResult<WebhookEvent>> {
    const where = { status: WebhookStatus.FAILED };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);
    return paginate(data, total, pagination.page, pagination.take);
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async dispatch(
    eventType: WebhookEventType,
    process: () => Promise<void> | undefined,
    record: WebhookEvent,
  ): Promise<void> {
    try {
      const result = process();

      if (!result) {
        // Nenhum processor encontrado para este tipo de evento
        this.logger.debug(
          `[wh:${record.id}] No processor for event type "${eventType}" — marking IGNORED`,
        );
        await this.prisma.webhookEvent.update({
          where: { id: record.id },
          data: { status: WebhookStatus.IGNORED, processedAt: new Date() },
        });
        return;
      }

      await result;
      await this.idempotency.markProcessed(record.id);

      this.logger.log(
        `[wh:${record.id}] Event "${eventType}" processed successfully`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Log seguro: nunca loga o payload completo (pode conter PII)
      this.logger.error(
        `[wh:${record.id}] Failed to process event "${eventType}": ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.idempotency.markFailed(record.id, error);

      // NÃO relança a exceção — o controller retorna 200 ao gateway
      // O evento ficou salvo com status FAILED e pode ser reprocessado via retryFailed()
    }
  }

  private resolveGateway(gateway: PaymentGateway): IPaymentGateway {
    if (gateway === PaymentGateway.EFI) return this.efiGateway;
    if (gateway === PaymentGateway.STRIPE) return this.stripeGateway;
    throw new Error(`Unsupported gateway: ${gateway}`);
  }

  private resolveProcessor(eventType: WebhookEventType): IWebhookProcessor | undefined {
    return this.processors.find((p) => p.canHandle(eventType));
  }

  /**
   * Parseia o payload armazenado no banco de volta para ParsedWebhookEvent.
   * Usado no retry — evita re-chamar o gateway (sem raw body disponível).
   */
  private rebuildParsedEvent(record: WebhookEvent) {
    return {
      eventId: record.eventId,
      eventType: record.eventType as WebhookEventType,
      data: record.payload as any,
    };
  }

  /**
   * Converte o rawBody para objeto JSON para armazenamento.
   * Não loga o conteúdo — pode conter PII.
   */
  private sanitizeForStorage(rawBody: Buffer): unknown {
    try {
      return JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return { raw: '[unparseable]' };
    }
  }
}
