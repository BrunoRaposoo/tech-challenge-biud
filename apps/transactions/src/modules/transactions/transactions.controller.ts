import { Controller, Post, Get, Body, Param, UsePipes, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { createTransactionSchema } from '@repo/shared';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(@Inject(TransactionsService) private service: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria transação PENDING',
    description: 'Salva PENDING e publica transaction.created',
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Transação PENDING criada',
    schema: {
      example: {
        transactionExternalId: '550e8400-e29b-41d4-a716-446655440000',
        transactionType: { name: 'PIX' },
        transactionStatus: { name: 'PENDING' },
        value: 120,
        createdAt: '2026-08-26T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @UsePipes(new ZodValidationPipe(createTransactionSchema))
  async create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Get(':externalId')
  @ApiOperation({ summary: 'Recupera transação por externalId' })
  @ApiParam({
    name: 'externalId',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Transação encontrada' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Param('externalId') externalId: string) {
    return this.service.findOne(externalId);
  }
}
