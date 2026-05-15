import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePlanBodyDto {
  @ApiProperty({
    description: 'New plan code',
    enum: ['STARTER', 'STANDARD', 'PRO'],
    example: 'PRO',
  })
  @IsEnum(['STARTER', 'STANDARD', 'PRO'] as const)
  readonly newPlanCode!: 'STARTER' | 'STANDARD' | 'PRO';
}

export class CancelSubscriptionBodyDto {
  @ApiProperty({
    description: 'Cancellation reason',
    example: 'Переезжаем на другой сервис',
    maxLength: 500,
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  readonly reason!: string;
}

export class PayInvoiceResponseDto {
  @ApiProperty({ example: 'pay_mock_c1111111' })
  readonly paymentRef!: string;

  @ApiProperty({
    description: 'Redirect URL for external payment (null in demo mode)',
    example: null,
    nullable: true,
  })
  readonly redirectUrl!: string | null;

  @ApiProperty({
    description: 'Demo — see ADR for Phase 2 YooKassa integration',
    enum: ['PAID', 'PENDING'],
    example: 'PAID',
  })
  readonly demoStatus!: 'PAID' | 'PENDING';
}
