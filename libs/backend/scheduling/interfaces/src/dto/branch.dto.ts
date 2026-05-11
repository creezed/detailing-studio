import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBranchRequestDto {
  @ApiProperty({ example: 'Филиал на Ленина' })
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @ApiProperty({ example: 'г. Москва, ул. Ленина, д. 10' })
  @IsString()
  @IsNotEmpty()
  readonly address!: string;

  @ApiProperty({ example: 'Europe/Moscow' })
  @IsString()
  @IsNotEmpty()
  readonly timezone!: string;
}

export class UpdateBranchRequestDto {
  @ApiPropertyOptional({ example: 'Филиал на Мира' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @ApiPropertyOptional({ example: 'г. Москва, ул. Мира, д. 5' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly address?: string;

  @ApiPropertyOptional({ example: 'Europe/Moscow' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly timezone?: string;
}

export class ListBranchesQueryDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly isActive?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize: number = 20;
}

export class BranchCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;
}

export class BranchListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty()
  readonly address!: string;

  @ApiProperty()
  readonly timezone!: string;

  @ApiProperty()
  readonly isActive!: boolean;
}
