import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = process.env.TRANSACTIONS_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Transactions API listening on ${port}`);
}
bootstrap();
