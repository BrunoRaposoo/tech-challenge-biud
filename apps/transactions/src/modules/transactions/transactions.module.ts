import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';
import { KafkaService } from '../kafka/kafka.service.js';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, KafkaService],
})
export class TransactionsModule {}
