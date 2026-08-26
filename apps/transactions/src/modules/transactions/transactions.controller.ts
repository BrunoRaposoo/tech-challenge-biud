import { Controller, Post, Get, Body, Param, UsePipes, Inject } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { createTransactionSchema } from '@repo/shared';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(@Inject(TransactionsService) private service: TransactionsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createTransactionSchema))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get(':externalId')
  async findOne(@Param('externalId') externalId: string) {
    return this.service.findOne(externalId);
  }
}
