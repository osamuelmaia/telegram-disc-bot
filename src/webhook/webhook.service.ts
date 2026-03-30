import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, WebhookEvent, WebhookStatus } from '@prisma/client';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.type';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IPaymentGateway, WebhookEventType } from '../payment/interfaces/payment-gateway.interface';
import { GatewayFactoryService } from '../payment-gateway/gateway-factory.service';
import { PrismaService } from '../prisma/prisma.service';
import { IWebhookProcessor } from './processors/webhook-processor.interface';
import { PixWebhookProcessor } from './processors/pix.processor';
import { SubscriptionWebhookProcessor } from './processors/subscription.processor';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

// =============================================================================
// WebhookService — Pipeline de processamento de webhooks (multi-tenant)
// =============================================================================
//
// Fluxo para cada requisição:
//   1. PARSE     → GatewayFactoryService resolve o gateway do tenant
//   2. PERSIST   → salva payload bruto com idempotência
//   3. DISPATCH  → encontra o processor para o tipo de evento
//   4. PROCESS   → processor.handle() atualiza banco e emite eventos
//   5. MARK      → PROCESSED ou FAILED
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
    private readonly gatewayFactory: GatewayFactoryService,
  ) {
    this.processors = [pixProcessor, subscriptionProcessor];
  }

  async receive(
    tenantId: string,
    gateway: PaymentGateway,
    rawBody: Buffer,
    headers: Record<string, string>,
  ): Promise<void> {
    const gatewayInstance = await this.gatewayFactory.getGateway(tenantId, gateway);

    let events: ReturnType<IPaymentGateway['parseWebhookEvent']>;

    try {
      events = gatewayInstance.parseWebhookEvent(rawBody, headers);
    } catch (err) {
      throw err; // Assinatura inválida — propaga 4xx
    }

    const rawPayloadForStorage = this.sanitizeForStorage(rawBody);

    // Processa cada evento do batch sequencialmente (EFI pode enviar vários pix em um POST).
    for (const parsed of events) {
      const { skip, record } = await this.idempotency.tryAcquire(
        gateway,
        parsed.eventId,
        parsed.eventType,
        rawPayloadForStorage,
        tenantId,
      );

      if (skip || !record) continue;

      await this.dispatch(
        parsed.eventType,
        () => this.resolveProcessor(parsed.eventType)?.handle(parsed, record.id),
        record,
      );
    }
  }

  async retryFailed(webhookEventId: string): Promise<void> {
    const record = await this.idempotency.reacquireForRetry(webhookEventId);

    if (!record) {
      this.logger.warn(`retryFailed: event ${webhookEventId} not found or not in FAILED status`);
      return;
    }

    const parsed = this.rebuildParsedEvent(record);

    await this.dispatch(
      parsed.eventType,
      () => this.resolveProcessor(parsed.eventType)?.handle(parsed, record.id),
      record,
    );
  }

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
        this.logger.debug(
          `[wh:${record.id}] No processor for event type "${eventType}" — marking PROCESSED (ignored)`,
        );
        await this.prisma.webhookEvent.update({
          where: { id: record.id },
          data: { status: WebhookStatus.PROCESSED, processedAt: new Date() },
        });
        return;
      }

      await result;
      await this.idempotency.markProcessed(record.id);

      this.logger.log(`[wh:${record.id}] Event "${eventType}" processed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[wh:${record.id}] Failed to process event "${eventType}": ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.idempotency.markFailed(record.id, error);
    }
  }

  private resolveProcessor(eventType: WebhookEventType): IWebhookProcessor | undefined {
    return this.processors.find((p) => p.canHandle(eventType));
  }

  private rebuildParsedEvent(record: WebhookEvent) {
    return {
      eventId: record.eventId,
      eventType: record.eventType as WebhookEventType,
      data: record.payload as any,
    };
  }

  private sanitizeForStorage(rawBody: Buffer): unknown {
    try {
      return JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return { raw: '[unparseable]' };
    }
  }
}
