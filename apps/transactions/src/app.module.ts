import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { CatchEverythingFilter } from './common/filters/catch-everything.filter.js';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: CatchEverythingFilter },
  ],
})
export class AppModule {}
