import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// =============================================================================
// EfiSignatureGuard
// =============================================================================
// Valida a autenticidade de webhooks recebidos do Efí Bank.
//
// Modos de autenticação:
//
// 1. Produção (recomendado): mTLS
//    O Efí Bank autentica o cliente com certificado mTLS no nível de rede.
//    Nenhuma validação adicional é necessária na aplicação — o TLS garante
//    que apenas o Efí pode enviar para o endpoint.
//    Configure: EFI_WEBHOOK_SECRET="" (não definir ou deixar vazio)
//
// 2. Sandbox / Fallback: x-webhook-secret header
//    Define EFI_WEBHOOK_SECRET no .env e configure o mesmo valor no
//    painel Efí Bank → Minha Conta → API → Webhooks → Secret.
//    O guard valida o header em tempo constante para prevenir timing attacks.
// =============================================================================

@Injectable()
export class EfiSignatureGuard implements CanActivate {
  private readonly logger = new Logger(EfiSignatureGuard.name);
  private readonly webhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.webhookSecret = this.config.get<string>('EFI_WEBHOOK_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    // Sem secret configurado → confia no mTLS (validado a nível de infraestrutura)
    if (!this.webhookSecret) {
      this.logger.debug('EFI_WEBHOOK_SECRET not set — trusting mTLS authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const receivedSecret =
      request.headers['x-webhook-secret'] ?? request.headers['X-Webhook-Secret'];

    if (typeof receivedSecret !== 'string') {
      this.logger.warn('Efí webhook rejected: missing x-webhook-secret header');
      throw new UnauthorizedException('Missing webhook secret');
    }

    // Comparação em tempo constante para prevenir timing attacks
    if (!timingSafeEqual(receivedSecret, this.webhookSecret)) {
      this.logger.warn('Efí webhook rejected: invalid x-webhook-secret');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}

/**
 * Comparação de strings em tempo constante.
 * Evita timing attacks onde um atacante infere o secret medindo o tempo de resposta.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
