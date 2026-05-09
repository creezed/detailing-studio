import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceCategoryRequestDto {
  @ApiProperty({ example: 'Полировка' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: 'polish' })
  @IsString()
  @IsNotEmpty()
  declare icon: string;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  declare displayOrder: number;
}

export class UpdateServiceCategoryRequestDto {
  @ApiPropertyOptional({ example: 'Детейлинг' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'detail' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class ServiceCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty()
  declare name: string;

  @ApiProperty()
  declare icon: string;

  @ApiProperty()
  declare displayOrder: number;

  @ApiProperty()
  declare isActive: boolean;
}

export class ServiceCategoryCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}
