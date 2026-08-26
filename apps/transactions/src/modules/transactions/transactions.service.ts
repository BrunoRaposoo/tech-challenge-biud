import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KafkaService } from '../kafka/kafka.service.js';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private kafka: KafkaService,
  ) {}

  async create(dto: {
    accountExternalIdDebit: string;
    accountExternalIdCredit: string;
    transferTypeId: number;
    value: number;
  }) {
    const type = await this.prisma.transactionType.findUnique({
      where: { id: dto.transferTypeId },
    });
    if (!type) {
      throw new NotFoundException({
        message: 'TransactionType not found',
        transferTypeId: dto.transferTypeId,
      });
    }
    const tx = await this.prisma.transaction.create({
      data: {
        accountExternalIdDebit: dto.accountExternalIdDebit,
        accountExternalIdCredit: dto.accountExternalIdCredit,
        transferTypeId: dto.transferTypeId,
        value: dto.value,
        status: 'PENDING',
      },
      include: { type: true },
    });
    await this.kafka.emit('transaction.created', {
      transactionExternalId: tx.transactionExternalId,
      accountExternalIdDebit: tx.accountExternalIdDebit,
      accountExternalIdCredit: tx.accountExternalIdCredit,
      transferTypeId: tx.transferTypeId,
      value: Number(tx.value),
      createdAt: tx.createdAt.toISOString(),
    });
    return {
      transactionExternalId: tx.transactionExternalId,
      transactionType: { name: tx.type.name },
      transactionStatus: { name: tx.status },
      value: Number(tx.value),
      createdAt: tx.createdAt,
    };
  }

  async findOne(externalId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { transactionExternalId: externalId },
      include: { type: true },
    });
    if (!tx) {
      throw new NotFoundException({
        message: 'Transaction not found',
        transactionExternalId: externalId,
      });
    }
    return {
      transactionExternalId: tx.transactionExternalId,
      transactionType: { name: tx.type.name },
      transactionStatus: { name: tx.status },
      value: Number(tx.value),
      createdAt: tx.createdAt,
    };
  }
}
