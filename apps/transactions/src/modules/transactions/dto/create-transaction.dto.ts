import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ type: String, format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  accountExternalIdDebit!: string;

  @ApiProperty({ type: String, format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' })
  accountExternalIdCredit!: string;

  @ApiProperty({ type: Number, example: 1, description: 'ID do tipo de transferência' })
  transferTypeId!: number;

  @ApiProperty({ type: Number, example: 120, description: 'Valor da transação' })
  value!: number;
}
