import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TimeRangeDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  readonly start!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @IsNotEmpty()
  readonly end!: string;
}

export class WorkingDayDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  readonly openAt!: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  @IsNotEmpty()
  readonly closeAt!: string;

  @ApiPropertyOptional({ type: [TimeRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  readonly breaks?: readonly TimeRangeDto[];
}

export class WeeklyPatternDayDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  readonly dayOfWeek!: number;

  @ApiPropertyOptional({ type: WorkingDayDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingDayDto)
  readonly workingDay?: WorkingDayDto | null;
}

export class SetBranchScheduleRequestDto {
  @ApiProperty({ type: [WeeklyPatternDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPatternDayDto)
  readonly weeklyPattern!: readonly WeeklyPatternDayDto[];
}

export class AddScheduleExceptionRequestDto {
  @ApiProperty({ example: '2026-05-20' })
  @IsString()
  @IsNotEmpty()
  readonly date!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  readonly isClosed!: boolean;

  @ApiPropertyOptional({ type: TimeRangeDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  readonly customRange?: TimeRangeDto | null;

  @ApiPropertyOptional({ example: 'Праздничный день' })
  @IsOptional()
  @IsString()
  readonly reason?: string | null;
}

export class AddUnavailabilityRequestDto {
  @ApiProperty({ example: '2026-05-15T10:00:00+03:00' })
  @IsString()
  @IsNotEmpty()
  readonly fromAt!: string;

  @ApiProperty({ example: '2026-05-15T18:00:00+03:00' })
  @IsString()
  @IsNotEmpty()
  readonly toAt!: string;

  @ApiProperty({ example: 'Отпуск' })
  @IsString()
  @IsNotEmpty()
  readonly reason!: string;
}

export class ScheduleIdResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;
}
