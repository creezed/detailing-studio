import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiptLineRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare id: string;

  @ApiProperty({ format: 'uuid', description: 'SKU ID' })
  @IsUUID()
  declare skuId: string;

  @ApiPropertyOptional({ description: 'Packaging ID' })
  @IsOptional()
  @IsString()
  packagingId?: string | null;

  @ApiProperty({ example: 1, description: 'Кол-во упаковок' })
  @IsNumber()
  @Min(0)
  declare packageQuantity: number;

  @ApiProperty({ example: 500, description: 'Кол-во в базовых единицах' })
  @IsNumber()
  @Min(0)
  declare baseQuantityAmount: number;

  @ApiProperty({ example: 'ML', description: 'Единица измерения' })
  @IsString()
  @IsNotEmpty()
  declare baseQuantityUnit: string;

  @ApiProperty({ example: '150000', description: 'Стоимость за единицу в копейках' })
  @IsString()
  @IsNotEmpty()
  declare unitCostCents: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Срок годности' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class CreateReceiptRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare supplierId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare branchId: string;

  @ApiPropertyOptional({ example: 'INV-2025-001' })
  @IsOptional()
  @IsString()
  supplierInvoiceNumber?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  supplierInvoiceDate?: string | null;
}

export class UpdateReceiptRequestDto {
  @ApiProperty({ type: [ReceiptLineRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineRequestDto)
  declare lines: ReceiptLineRequestDto[];
}

export class CancelReceiptRequestDto {
  @ApiProperty({ example: 'Ошибка в документе' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class ReceiptCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class ReceiptListQueryDto {
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

  @ApiPropertyOptional({ example: 'DRAFT' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
