import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const WORK_ORDER_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'AWAITING_REVIEW',
  'CLOSING',
  'CLOSED',
  'CANCELLED',
] as const;

export class ListWorkOrdersQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  masterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ enum: WORK_ORDER_STATUSES })
  @IsOptional()
  @IsEnum(WORK_ORDER_STATUSES)
  status?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class GetMyWorkOrdersQueryDto {
  @ApiPropertyOptional({ enum: WORK_ORDER_STATUSES, isArray: true })
  @IsOptional()
  statuses?: string[];

  @ApiPropertyOptional({ format: 'date', example: '2026-05-12' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class CancelWorkOrderRequestDto {
  @ApiProperty({ example: 'Клиент отменил визит' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class ReopenWorkOrderRequestDto {
  @ApiProperty({ example: 'Обнаружен дефект после закрытия' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class ReturnToInProgressRequestDto {
  @ApiProperty({ example: 'Необходимо доработать' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class NormDeviationReportQueryDto {
  @ApiProperty({ format: 'date-time', example: '2026-01-01T00:00:00Z' })
  @IsISO8601()
  declare dateFrom: string;

  @ApiProperty({ format: 'date-time', example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  declare dateTo: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  masterId?: string;
}

export class WorkOrderListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty({ format: 'uuid' })
  declare appointmentId: string;

  @ApiProperty({ enum: WORK_ORDER_STATUSES })
  declare status: string;

  @ApiProperty({ format: 'date-time' })
  declare openedAt: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  declare closedAt: string | null;

  @ApiProperty()
  declare masterFullName: string;

  @ApiProperty()
  declare clientFullName: string;

  @ApiProperty()
  declare servicesCount: number;

  @ApiProperty()
  declare linesCount: number;

  @ApiProperty()
  declare photosCount: number;
}

export class PaginatedWorkOrderListResponseDto {
  @ApiProperty({ type: [WorkOrderListItemResponseDto] })
  declare items: WorkOrderListItemResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  declare nextCursor: string | null;
}
