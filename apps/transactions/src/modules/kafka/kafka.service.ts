import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { transactionStatusUpdatedEventSchema } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
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
  private consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID_TRANSACTIONS ?? 'transactions-consumer',
  });
  constructor(private prisma: PrismaService) {}
  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'transaction.status.updated', fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString() ?? '';
        const key = message.key?.toString();

        let parsed: ReturnType<typeof transactionStatusUpdatedEventSchema.safeParse>;
        try {
          parsed = transactionStatusUpdatedEventSchema.safeParse(JSON.parse(raw));
        } catch {
          this.logger.error('Mensagem inválida (JSON) em transaction.status.updated — DLQ.');
          await this.sendToDlq('transaction.status.updated', raw, key);
          return;
        }

        if (!parsed.success) {
          this.logger.warn(`Payload inválido: ${parsed.error.message} — DLQ.`);
          await this.sendToDlq('transaction.status.updated', raw, key);
          return;
        }

        try {
          await this.handleStatusUpdated(parsed.data);
        } catch (err) {
          // Falha de processamento (ex.: banco): não commita o offset; o kafkajs reentrega.
          this.logger.error(
            `Falha ao processar transaction.status.updated: ${err instanceof Error ? err.message : String(err)}`,
          );
          throw err;
        }
      },
    });
  }
  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
  async emitCreated(payload: {
    transactionExternalId: string;
    accountExternalIdDebit: string;
    accountExternalIdCredit: string;
    transferTypeId: number;
    value: number;
    createdAt: string;
  }) {
    await this.producer.send({
      topic: 'transaction.created',
      acks: -1,
      messages: [{ key: payload.transactionExternalId, value: JSON.stringify(payload) }],
    });
  }
  async handleStatusUpdated(payload: {
    transactionExternalId: string;
    status: 'APPROVED' | 'REJECTED';
    evaluatedAt: string;
  }) {
    await this.prisma.transaction.updateMany({
      where: { transactionExternalId: payload.transactionExternalId, status: 'PENDING' },
      data: { status: payload.status },
    });
  }
  private async sendToDlq(topic: string, value: string, key?: string) {
    await this.producer.send({
      topic: `${topic}.dlq`,
      messages: [{ ...(key ? { key } : {}), value }],
    });
  }
}
