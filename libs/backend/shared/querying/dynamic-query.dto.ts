import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DYNAMIC_QUERY_MAX_PAGE_SIZE = 100;

export class DynamicQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @ApiPropertyOptional({ default: 25, maximum: DYNAMIC_QUERY_MAX_PAGE_SIZE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DYNAMIC_QUERY_MAX_PAGE_SIZE)
  declare pageSize?: number;

  @ApiPropertyOptional({ example: '-createdAt,name' })
  @IsOptional()
  @IsString()
  declare sorts?: string;

  @ApiPropertyOptional({ example: 'status*=ACTIVE,PENDING|client.name@=Иван' })
  @IsOptional()
  @IsString()
  declare filters?: string;
}
