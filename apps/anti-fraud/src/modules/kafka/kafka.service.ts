import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'tech-challenge',
    brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
  });
  private producer: Producer = this.kafka.producer({
    idempotent: true,
    retry: { retries: 3, initialRetryTime: 100, multiplier: 2 },
  });
  async onModuleInit() {
    await this.producer.connect();
  }
  async onModuleDestroy() {
    await this.producer.disconnect();
  }
  async emitStatusUpdated(payload: {
    transactionExternalId: string;
    status: string;
    evaluatedAt: string;
  }) {
    await this.producer.send({
      topic: 'transaction.status.updated',
      acks: -1,
      messages: [{ key: payload.transactionExternalId, value: JSON.stringify(payload) }],
    });
  }
  async emitDlq(topic: string, value: string, key?: string) {
    await this.producer.send({
      topic: `${topic}.dlq`,
      messages: [{ ...(key ? { key } : {}), value }],
    });
  }
}
