import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, WebhookEvent, WebhookStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
// WebhookIdempotencyService
// =============================================================================
// Responsável por garantir que cada evento de webhook seja processado
// exatamente uma vez, mesmo que o gateway envie duplicatas.
//
// Estratégia:
//   1. Tenta CREATE do WebhookEvent (chave única: gateway + eventId)
//   2. Se P2002 (duplicata) → evento já existe → verifica status atual
//   3. Se status PROCESSED → retorna { skip: true } — já foi processado
//   4. Se status FAILED → permite reprocessamento
//   5. Se status PROCESSING → outro processo está tratando — retorna { skip: true }
//   6. Em caso de novo evento → retorna { skip: false, record }
//
// Lock otimista:
//   O INSERT com constraint única é atômico no PostgreSQL — não há race condition
//   entre dois processos tentando criar o mesmo evento simultaneamente.
// =============================================================================

export interface AcquireResult {
  /** true = evento já processado ou em processamento → não fazer nada */
  skip: boolean;
  record: WebhookEvent | null;
}

@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenta registrar o evento e adquirir o "lock" de processamento.
   * O payload bruto é armazenado imediatamente para auditoria e replay.
   *
   * @param gateway Gateway de origem
   * @param eventId ID único do evento (fornecido pelo gateway)
   * @param eventType Tipo do evento (ex: 'pix.paid', 'invoice.payment_succeeded')
   * @param rawPayload Payload bruto recebido (armazenado como-está para auditoria)
   */
  async tryAcquire(
    gateway: PaymentGateway,
    eventId: string,
    eventType: string,
    rawPayload: unknown,
  ): Promise<AcquireResult> {
    try {
      const record = await this.prisma.webhookEvent.create({
        data: {
          gateway,
          eventId,
          eventType,
          status: WebhookStatus.PROCESSING,
          payload: rawPayload as Prisma.InputJsonValue,
          attempts: 1,
        },
      });

      return { skip: false, record };
    } catch (error) {
      // P2002 = unique constraint violation — evento já existe
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.handleDuplicate(gateway, eventId);
      }

      throw error;
    }
  }

  /**
   * Marca o evento como processado com sucesso.
   */
  async markProcessed(webhookEventId: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: new Date(),
        error: null,
      },
    });
  }

  /**
   * Marca o evento como falhou, preservando a mensagem de erro.
   * O payload bruto permanece salvo para reprocessamento manual.
   */
  async markFailed(webhookEventId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookStatus.FAILED,
        error: message,
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Permite reprocessar manualmente eventos com status FAILED.
   * Retorna o record pronto para processamento, ou null se não for reprocessável.
   */
  async reacquireForRetry(webhookEventId: string): Promise<WebhookEvent | null> {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!event) return null;
    if (event.status !== WebhookStatus.FAILED) return null;

    return this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookStatus.PROCESSING,
        error: null,
        attempts: { increment: 1 },
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async handleDuplicate(
    gateway: PaymentGateway,
    eventId: string,
  ): Promise<AcquireResult> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { gateway_eventId: { gateway, eventId } },
    });

    if (!existing) {
      // Race condition extremamente improvável: foi deletado entre os dois selects
      return { skip: false, record: null };
    }

    switch (existing.status) {
      case WebhookStatus.PROCESSED:
        this.logger.debug(
          `[${gateway}] Duplicate event ${eventId} already processed — skipping`,
        );
        return { skip: true, record: existing };

      case WebhookStatus.PROCESSING:
        // Outro processo está tratando este evento agora.
        // Retorna skip=true; o gateway receberá 200 e não vai reenviar.
        this.logger.warn(
          `[${gateway}] Event ${eventId} is already being processed by another instance`,
        );
        return { skip: true, record: existing };

      case WebhookStatus.FAILED:
        // Permite reprocessamento: atualiza para PROCESSING e retorna o record
        this.logger.log(
          `[${gateway}] Reprocessing previously failed event ${eventId}`,
        );
        const updated = await this.prisma.webhookEvent.update({
          where: { id: existing.id },
          data: {
            status: WebhookStatus.PROCESSING,
            error: null,
            attempts: { increment: 1 },
          },
        });
        return { skip: false, record: updated };

      default:
        // RECEIVED/IGNORED — tratar como novo
        return { skip: false, record: existing };
    }
  }
}
