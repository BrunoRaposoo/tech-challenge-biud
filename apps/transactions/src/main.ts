import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Transactions API — BIUD Challenge')
    .setDescription(
      'Criação e consulta de transações com validação antifraude assíncrona (PENDING → APPROVED/REJECTED, regra >1000). Teste manual via Swagger UI sem Postman.',
    )
    .setVersion('1.0.0')
    .addTag('transactions', 'Criação e consulta')
    .addTag('health', 'Probe')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: true,
    explorer: true,
    jsonDocumentUrl: '/api/docs-json',
    yamlDocumentUrl: '/api/docs-yaml',
    customSiteTitle: 'BIUD Transactions — Swagger',
  });

  const port = process.env.TRANSACTIONS_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Transactions API listening on ${port} — docs at http://localhost:${port}/api/docs`);
}
bootstrap();
