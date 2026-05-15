import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MoneyDto } from './subscription.dto';

export class InvoicePeriodDto {
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  readonly startedAt!: string;

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  readonly endsAt!: string;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 'c1111111-1111-4111-8111-111111111111' })
  readonly id!: string;

  @ApiProperty({ enum: ['STARTER', 'STANDARD', 'PRO'], example: 'STARTER' })
  readonly planCode!: string;

  @ApiProperty({ type: MoneyDto })
  readonly amount!: MoneyDto;

  @ApiProperty({ type: InvoicePeriodDto })
  readonly period!: InvoicePeriodDto;

  @ApiProperty({ enum: ['ISSUED', 'PAID', 'VOIDED'], example: 'ISSUED' })
  readonly status!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  readonly issuedAt!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  readonly paidAt!: string | null;
}
