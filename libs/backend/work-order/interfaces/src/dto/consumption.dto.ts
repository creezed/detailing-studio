import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const UNITS = ['G', 'KG', 'L', 'M', 'ML', 'PCS'] as const;

export class AddConsumptionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare skuId: string;

  @ApiProperty({ minimum: 0, example: 150 })
  @IsNumber()
  @Min(0)
  declare amount: number;

  @ApiProperty({ enum: UNITS, example: 'ML' })
  @IsEnum(UNITS)
  declare unit: string;

  @ApiPropertyOptional({ example: 'Сложная поверхность, повышенный расход' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  deviationReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateConsumptionRequestDto {
  @ApiProperty({ minimum: 0, example: 120 })
  @IsNumber()
  @Min(0)
  declare amount: number;

  @ApiProperty({ enum: UNITS, example: 'ML' })
  @IsEnum(UNITS)
  declare unit: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  deviationReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
