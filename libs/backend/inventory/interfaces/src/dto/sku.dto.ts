import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { UnitOfMeasure } from '@det/backend-shared-ddd';

export class PackagingDto {
  @ApiProperty({ example: 'Бутылка 500 мл' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: 500, description: 'Коэффициент пересчёта в базовую единицу' })
  @IsNumber()
  declare coefficient: number;
}

export class CreateSkuRequestDto {
  @ApiProperty({ example: 'ART-001' })
  @IsString()
  @IsNotEmpty()
  declare articleNumber: string;

  @ApiProperty({ example: 'Koch Chemie Nano Magic' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: 'Полироли' })
  @IsString()
  @IsNotEmpty()
  declare group: string;

  @ApiProperty({ enum: UnitOfMeasure, example: 'ML' })
  @IsEnum(UnitOfMeasure)
  declare baseUnit: UnitOfMeasure;

  @ApiProperty({ example: true })
  @IsBoolean()
  declare hasExpiry: boolean;

  @ApiProperty({ type: [PackagingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackagingDto)
  declare packagings: PackagingDto[];

  @ApiPropertyOptional({ example: '4260188680126' })
  @IsOptional()
  @IsString()
  barcode?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @ApiProperty({ example: 'Нано-полироль для финишной обработки' })
  @IsString()
  declare description: string;
}

export class UpdateSkuRequestDto {
  @ApiPropertyOptional({ example: 'Koch Chemie Nano Magic v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Полироли' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ type: [PackagingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackagingDto)
  packagings?: PackagingDto[];
}

export class SkuCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class SkuListQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  offset: number = 0;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional({ example: 'Полироли' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
