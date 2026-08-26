import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KafkaService {
  private readonly logger = new Logger(KafkaService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async emit(topic: string, payload: any) {
    this.logger.log(`[Kafka mock] emit ${topic}: ${JSON.stringify(payload)}`);
    // Fase 3 implementará kafkajs real
  }
}
