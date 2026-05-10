import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ContactDto {
  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: 'supplier@example.com' })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ example: 'г. Москва, ул. Ленина, 10' })
  @IsOptional()
  @IsString()
  address?: string | null;
}

export class CreateSupplierRequestDto {
  @ApiProperty({ example: 'Koch Chemie Россия' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiPropertyOptional({ example: '7710140679' })
  @IsOptional()
  @IsString()
  inn?: string | null;

  @ApiProperty({ type: ContactDto })
  @ValidateNested()
  @Type(() => ContactDto)
  declare contact: ContactDto;
}

export class UpdateSupplierRequestDto {
  @ApiProperty({ type: ContactDto })
  @ValidateNested()
  @Type(() => ContactDto)
  declare contact: ContactDto;
}

export class SupplierCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;
}

export class SupplierListQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  offset: number = 0;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
