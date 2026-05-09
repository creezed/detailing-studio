import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { DYNAMIC_QUERY_MAX_PAGE_SIZE } from '../core/dynamic-query.types';

export { DYNAMIC_QUERY_MAX_PAGE_SIZE } from '../core/dynamic-query.types';

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
