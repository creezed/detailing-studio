import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class MeasurementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare skuId: string;

  @ApiProperty({ example: 450, description: 'Фактическое количество' })
  @IsNumber()
  @Min(0)
  declare actualAmount: number;

  @ApiProperty({ example: 'ML', description: 'Единица измерения' })
  @IsString()
  @IsNotEmpty()
  declare actualUnit: string;
}

export class StartStockTakingRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare branchId: string;
}

export class RecordMeasurementsRequestDto {
  @ApiProperty({ type: [MeasurementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasurementDto)
  declare measurements: MeasurementDto[];
}

export class StockTakingCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class StockTakingListQueryDto {
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

  @ApiPropertyOptional({ example: 'STARTED' })
  @IsOptional()
  @IsString()
  status?: string;
}
