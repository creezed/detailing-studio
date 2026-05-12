import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const NOTIFICATION_STATUSES = [
  'PENDING',
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'DEDUPED',
  'EXPIRED',
] as const;

const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'TELEGRAM', 'PUSH'] as const;

export class ListMyNotificationsQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_STATUSES, example: 'SENT' })
  @IsOptional()
  @IsEnum(NOTIFICATION_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'APPOINTMENT_CONFIRMED' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS, example: 'EMAIL' })
  @IsOptional()
  @IsEnum(NOTIFICATION_CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-05-01T00:00:00+03:00' })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-05-13T23:59:59+03:00' })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Курсор пагинации' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class QuietHoursDto {
  @ApiProperty({ example: 1320, description: 'Начало тихих часов (минута дня, 22:00 = 1320)' })
  @IsInt()
  @Min(0)
  @Max(1439)
  declare startMinuteOfDay: number;

  @ApiProperty({ example: 480, description: 'Конец тихих часов (минута дня, 08:00 = 480)' })
  @IsInt()
  @Min(0)
  @Max(1439)
  declare endMinuteOfDay: number;

  @ApiProperty({ example: 'Europe/Moscow', description: 'IANA timezone' })
  @IsString()
  @IsNotEmpty()
  declare timezone: string;
}

export class UpdatePreferencesBodyDto {
  @ApiPropertyOptional({
    description: 'Каналы по шаблонам',
    example: { APPOINTMENT_CONFIRMED: ['EMAIL', 'PUSH'], WORK_ORDER_COMPLETED: ['SMS'] },
  })
  @IsOptional()
  channelsByTemplate?: Record<string, string[]>;

  @ApiPropertyOptional({ type: QuietHoursDto, description: 'Тихие часы' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;
}

export class PushSubscriptionKeysDto {
  @ApiProperty({ example: 'BNcRdreALRFXTkOOUH...' })
  @IsString()
  @IsNotEmpty()
  declare p256dh: string;

  @ApiProperty({ example: 'tBHItJI5SvA6F7...' })
  @IsString()
  @IsNotEmpty()
  declare auth: string;
}

export class SavePushSubscriptionBodyDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/abc123' })
  @IsUrl()
  declare endpoint: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  declare keys: PushSubscriptionKeysDto;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 (Linux; Android 13)' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class UnsubscribeQueryDto {
  @ApiProperty({ description: 'HMAC-токен отписки' })
  @IsString()
  @IsNotEmpty()
  declare token: string;
}

export class ListNotificationsAdminQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_STATUSES })
  @IsOptional()
  @IsEnum(NOTIFICATION_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'LOW_STOCK' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS })
  @IsOptional()
  @IsEnum(NOTIFICATION_CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-05-01T00:00:00+03:00' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-05-13T23:59:59+03:00' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
