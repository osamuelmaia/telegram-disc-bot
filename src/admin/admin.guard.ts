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
// AdminGuard — Autenticação de endpoints administrativos via API Key
// =============================================================================
// Estratégia intencional: API Key simples no header `x-admin-key`.
//
// Por que não JWT aqui:
//   O painel admin é acessado por uma única parte (o dono do bot).
//   JWT adiciona complexidade (refresh, rotation, storage) sem benefício real
//   para este caso de uso. Uma API Key rotacionável no .env é suficiente e segura.
//
// Configuração:
//   ADMIN_API_KEY=chave-longa-e-aleatoria-minimo-32-chars
//
// Uso:
//   @UseGuards(AdminGuard)
//   @Controller('admin/...')
//
// Em produção, restringir o endpoint admin por IP no nginx/load balancer
// é uma camada adicional recomendada além desta guard.
// =============================================================================

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('ADMIN_API_KEY');

    if (!key || key.length < 32) {
      throw new Error(
        'ADMIN_API_KEY must be set and at least 32 characters long. ' +
          'Generate one with: openssl rand -hex 32',
      );
    }

    this.apiKey = key;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const receivedKey = request.headers['x-admin-key'];

    if (typeof receivedKey !== 'string') {
      this.logger.warn(
        `Admin access denied — missing x-admin-key header [ip=${this.getIp(request)}]`,
      );
      throw new UnauthorizedException('Missing x-admin-key header');
    }

    if (!timingSafeEqual(receivedKey, this.apiKey)) {
      // Log sem revelar a chave recebida — apenas comprimento e IP para diagnóstico
      this.logger.warn(
        `Admin access denied — invalid key [len=${receivedKey.length} ip=${this.getIp(request)}]`,
      );
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }

  private getIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.socket.remoteAddress ??
      'unknown'
    );
  }
}

/**
 * Comparação de strings em tempo constante.
 * Impede timing attacks onde o atacante infere a chave medindo latência de resposta.
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Comprimentos diferentes → não iguais, mas percorre mesmo assim para tempo constante
  const len = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // diferença de comprimento já marca como diferente

  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }

  return result === 0;
}
