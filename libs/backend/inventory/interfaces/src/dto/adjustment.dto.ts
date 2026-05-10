import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class AdjustmentLineRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare skuId: string;

  @ApiProperty({ example: -2.5, description: 'Дельта количества (+ излишек, - недостача)' })
  @IsNumber()
  declare deltaAmount: number;

  @ApiProperty({ example: 'ML', description: 'Единица измерения' })
  @IsString()
  @IsNotEmpty()
  declare deltaUnit: string;

  @ApiProperty({ example: '150000', description: 'Себестоимость за единицу в копейках' })
  @IsString()
  @IsNotEmpty()
  declare snapshotUnitCostCents: string;
}

export class CreateAdjustmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare branchId: string;

  @ApiProperty({ example: 'Пересортица по итогам инвентаризации' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;

  @ApiProperty({ type: [AdjustmentLineRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineRequestDto)
  declare lines: AdjustmentLineRequestDto[];
}

export class RejectAdjustmentRequestDto {
  @ApiProperty({ example: 'Нет обоснования' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class AdjustmentCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class AdjustmentListQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  offset: number = 0;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;
}
