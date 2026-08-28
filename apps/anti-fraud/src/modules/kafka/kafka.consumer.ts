import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { transactionCreatedEventSchema } from '@repo/shared';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service.js';
import { KafkaService } from './kafka.service.js';
@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumer.name);
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'tech-challenge',
    brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
  });
  private consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID_ANTI_FRAUD ?? 'anti-fraud-consumer',
  });
  constructor(
    private antiFraud: AntiFraudService,
    private kafkaService: KafkaService,
  ) {}
  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'transaction.created', fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString() ?? '';
        const key = message.key?.toString();

        let parsed: ReturnType<typeof transactionCreatedEventSchema.safeParse>;
        try {
          parsed = transactionCreatedEventSchema.safeParse(JSON.parse(raw));
        } catch {
          this.logger.error('Mensagem inválida (JSON) em transaction.created — DLQ.');
          await this.kafkaService.emitDlq('transaction.created', raw, key);
          return;
        }

        if (!parsed.success) {
          this.logger.warn(`Payload inválido: ${parsed.error.message} — DLQ.`);
          await this.kafkaService.emitDlq('transaction.created', raw, key);
          return;
        }

        // Avaliação + publicação: falha aqui não deve commitar o offset (kafkajs reentrega).
        const status = this.antiFraud.evaluate(parsed.data.value);
        await this.kafkaService.emitStatusUpdated({
          transactionExternalId: parsed.data.transactionExternalId,
          status,
          evaluatedAt: new Date().toISOString(),
        });
      },
    });
  }
  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
