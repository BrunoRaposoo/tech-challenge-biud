import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Anti-Fraud API — BIUD Challenge')
    .setDescription(
      'Avalia transação >1000 → REJECTED, caso contrário APPROVED. Consome transaction.created e publica transaction.status.updated.',
    )
    .setVersion('1.0.0')
    .addTag('anti-fraud', 'Avaliação')
    .addTag('health', 'Probe')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    explorer: true,
    customSiteTitle: 'BIUD Anti-Fraud — Swagger',
  });
  const port = process.env.ANTI_FRAUD_PORT ?? 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Anti-Fraud API listening on ${port} — docs at http://localhost:${port}/api/docs`);
}
bootstrap();
