import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { PrismaService } from './modules/prisma/prisma.service.js';
import { ParameterMetadataAccessor } from '@nestjs/swagger/dist/services/parameter-metadata-accessor.js';

// Patch para vitest/esbuild sem emitDecoratorMetadata: evita crash quando PARAMTYPES_METADATA undefined
const originalExplore = ParameterMetadataAccessor.prototype.explore;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ParameterMetadataAccessor.prototype as any).explore = function (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prototype: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method: any,
) {
  try {
    return originalExplore.call(this, instance, prototype, method);
  } catch {
    return undefined;
  }
};

describe('Swagger', () => {
  it('documenta POST /api/transactions', async () => {
    const prismaMock = {
      $connect: async () => {},
      $disconnect: async () => {},
      transaction: {
        create: async () => ({}),
        findUnique: async () => null,
        findMany: async () => [],
        count: async () => 0,
      },
      transactionType: {
        findUnique: async () => ({ id: 1, name: 'PIX' }),
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    const nestApp = moduleRef.createNestApplication();
    nestApp.setGlobalPrefix('api');
    await nestApp.init();
    const config = new DocumentBuilder().setTitle('Test').setVersion('1.0').build();
    const doc = SwaggerModule.createDocument(nestApp, config) as unknown as Record<string, unknown>;
    const paths = doc.paths as Record<string, unknown>;
    expect(paths['/api/transactions']).toBeDefined();
    await nestApp.close();
  });
});
