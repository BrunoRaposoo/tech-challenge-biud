import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AntiFraudModule } from './modules/anti-fraud/anti-fraud.module.js';
@Module({ imports: [AntiFraudModule], controllers: [AppController] })
export class AppModule {}
