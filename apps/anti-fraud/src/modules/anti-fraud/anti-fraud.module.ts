import { Module } from '@nestjs/common';
import { AntiFraudService } from './anti-fraud.service.js';
import { KafkaService } from '../kafka/kafka.service.js';
import { KafkaConsumer } from '../kafka/kafka.consumer.js';
@Module({ providers: [AntiFraudService, KafkaService, KafkaConsumer], exports: [AntiFraudService] })
export class AntiFraudModule {}
