import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PricingTypeEnum {
  FIXED = 'FIXED',
  BY_BODY_TYPE = 'BY_BODY_TYPE',
}

export class BodyTypePriceDto {
  @ApiProperty({ example: 'SEDAN' })
  @IsString()
  @IsNotEmpty()
  declare bodyType: string;

  @ApiProperty({ example: '500000', description: 'Price in cents as string' })
  @IsString()
  @IsNotEmpty()
  declare priceCents: string;
}

export class PricingDto {
  @ApiProperty({ enum: PricingTypeEnum })
  @IsEnum(PricingTypeEnum)
  declare type: PricingTypeEnum;

  @ApiPropertyOptional({ example: '500000', description: 'Fixed price in cents (for FIXED type)' })
  @IsOptional()
  @IsString()
  fixedPriceCents?: string;

  @ApiPropertyOptional({
    type: [BodyTypePriceDto],
    description: 'Body type prices (for BY_BODY_TYPE)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BodyTypePriceDto)
  bodyTypePrices?: BodyTypePriceDto[];
}

export class BodyTypeCoefficientDto {
  @ApiProperty({ example: 'SEDAN' })
  @IsString()
  @IsNotEmpty()
  declare bodyType: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0)
  declare coefficient: number;
}

export class MaterialNormDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare skuId: string;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  declare amount: number;

  @ApiPropertyOptional({ type: [BodyTypeCoefficientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BodyTypeCoefficientDto)
  bodyTypeCoefficients?: BodyTypeCoefficientDto[];
}

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'Полировка кузова' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: 'Базовая полировка кузова' })
  @IsString()
  @IsNotEmpty()
  declare description: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare categoryId: string;

  @ApiProperty({ example: 60, minimum: 1 })
  @IsInt()
  @Min(1)
  declare durationMinutes: number;

  @ApiProperty({ type: PricingDto })
  @ValidateNested()
  @Type(() => PricingDto)
  declare pricing: PricingDto;

  @ApiProperty({ type: [MaterialNormDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialNormDto)
  declare materialNorms: MaterialNormDto[];

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  declare displayOrder: number;
}

export class UpdateServiceRequestDto {
  @ApiPropertyOptional({ example: 'Керамика' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Керамическое покрытие' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 90, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class ChangeServicePriceRequestDto {
  @ApiProperty({ type: PricingDto })
  @ValidateNested()
  @Type(() => PricingDto)
  declare pricing: PricingDto;
}

export class SetMaterialNormsRequestDto {
  @ApiProperty({ type: [MaterialNormDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialNormDto)
  declare norms: MaterialNormDto[];
}

export class ListServicesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class ServiceCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}
