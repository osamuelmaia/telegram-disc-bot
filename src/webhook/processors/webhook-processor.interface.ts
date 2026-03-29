import { ParsedWebhookEvent, WebhookEventType } from '../../payment/interfaces/payment-gateway.interface';

/**
 * Contrato dos processadores de eventos de webhook.
 * Cada processador é responsável por um domínio de eventos (Pix, Assinatura).
 */
export interface IWebhookProcessor {
  /** Tipos de eventos que este processador é capaz de tratar */
  readonly supportedEvents: ReadonlyArray<WebhookEventType>;

  /** Verifica se este processador trata o tipo de evento recebido */
  canHandle(eventType: WebhookEventType): boolean;

  /**
   * Processa o evento normalizado.
   * Deve ser idempotente: processar o mesmo evento duas vezes não deve causar efeitos colaterais.
   * Deve lançar exceção em caso de erro — o WebhookService marcará o evento como FAILED.
   *
   * @param event Evento normalizado pelo gateway
   * @param webhookEventId ID do registro WebhookEvent no banco (para logs correlacionados)
   */
  handle(event: ParsedWebhookEvent, webhookEventId: string): Promise<void>;
}
