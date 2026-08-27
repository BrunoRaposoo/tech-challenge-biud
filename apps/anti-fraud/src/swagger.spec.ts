import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { KafkaService } from './modules/kafka/kafka.service.js';
import { KafkaConsumer } from './modules/kafka/kafka.consumer.js';

describe('AntiFraud Swagger', () => {
  it('documenta health', async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KafkaService)
      .useValue({ onModuleInit: async () => {}, onModuleDestroy: async () => {} })
      .overrideProvider(KafkaConsumer)
      .useValue({ onModuleInit: async () => {}, onModuleDestroy: async () => {} })
      .compile();
    const app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('1.0').build(),
    ) as unknown as Record<string, unknown>;
    const paths = (doc as Record<string, unknown>).paths as Record<string, unknown>;
    expect(paths['/api/health']).toBeDefined();
    await app.close();
  });
});
