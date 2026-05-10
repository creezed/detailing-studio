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

export class TransferLineRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  declare skuId: string;

  @ApiProperty({ example: 100, description: 'Количество' })
  @IsNumber()
  @Min(0)
  declare quantityAmount: number;

  @ApiProperty({ example: 'ML', description: 'Единица измерения' })
  @IsString()
  @IsNotEmpty()
  declare quantityUnit: string;
}

export class CreateTransferRequestDto {
  @ApiProperty({ format: 'uuid', description: 'Филиал-отправитель' })
  @IsUUID()
  declare fromBranchId: string;

  @ApiProperty({ format: 'uuid', description: 'Филиал-получатель' })
  @IsUUID()
  declare toBranchId: string;

  @ApiProperty({ type: [TransferLineRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineRequestDto)
  declare lines: TransferLineRequestDto[];
}

export class TransferCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class TransferListQueryDto {
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
}
