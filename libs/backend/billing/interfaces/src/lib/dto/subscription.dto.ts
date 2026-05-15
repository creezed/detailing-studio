import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoneyDto {
  @ApiProperty({ example: '299000', description: 'Amount in kopecks (string for BigInt safety)' })
  readonly amount!: string;

  @ApiProperty({ example: 'RUB' })
  readonly currency!: string;
}

export class LimitItemDto {
  @ApiProperty({ example: 'branches' })
  readonly field!: string;

  @ApiProperty({ example: 1 })
  readonly used!: number;

  @ApiProperty({ example: 1, nullable: true })
  readonly limit!: number | null;

  @ApiProperty({ example: 100 })
  readonly percent!: number;

  @ApiProperty({ enum: ['OK', 'WARNING', 'EXCEEDED'], example: 'OK' })
  readonly status!: string;
}

export class LimitsUsageDto {
  @ApiProperty({ enum: ['OK', 'WARNING', 'EXCEEDED'], example: 'OK' })
  readonly status!: string;

  @ApiProperty({ type: [LimitItemDto] })
  readonly items!: LimitItemDto[];
}

export class SubscriptionResponseDto {
  @ApiProperty({ example: 'b1111111-1111-4111-8111-111111111111' })
  readonly id!: string;

  @ApiProperty({ enum: ['STARTER', 'STANDARD', 'PRO'], example: 'STARTER' })
  readonly planCode!: string;

  @ApiProperty({ example: 'Starter' })
  readonly planName!: string;

  @ApiProperty({ type: MoneyDto })
  readonly pricePerMonth!: MoneyDto;

  @ApiProperty({ enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED'], example: 'TRIAL' })
  readonly status!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  readonly currentPeriodStartedAt!: string;

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  readonly nextBillingAt!: string;

  @ApiPropertyOptional({ example: '2026-01-15T00:00:00.000Z', nullable: true })
  readonly trialEndsAt!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  readonly cancelledAt!: string | null;

  @ApiPropertyOptional({ type: LimitsUsageDto, nullable: true })
  readonly limitsUsage?: LimitsUsageDto | null;
}
