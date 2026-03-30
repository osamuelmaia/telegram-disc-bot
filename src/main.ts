import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true é obrigatório para verificação de assinatura do Stripe webhook
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`🚀 Application running on port ${port}`);
}

bootstrap();
