import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KafkaService } from '../kafka/kafka.service.js';
import { ListTransactionsQuery } from '@repo/shared';
import { Prisma } from '@prisma/client';

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
    await this.kafka.emitCreated({
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

  async findAll(q: ListTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.type) where.transferTypeId = q.type;
    if (q.from || q.to)
      where.createdAt = {
        gte: q.from ? new Date(q.from) : undefined,
        lte: q.to ? new Date(q.to) : undefined,
      };
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { type: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    const totalPages = Math.ceil(total / q.limit) || 1;
    return {
      data: data.map((tx) => ({
        transactionExternalId: tx.transactionExternalId,
        transactionType: { name: tx.type.name },
        transactionStatus: { name: tx.status },
        value: Number(tx.value),
        createdAt: tx.createdAt,
      })),
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages,
        hasNext: q.page < totalPages,
        hasPrev: q.page > 1,
      },
    };
  }
}
