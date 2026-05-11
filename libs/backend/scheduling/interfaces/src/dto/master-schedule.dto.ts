import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';

import { WeeklyPatternDayDto } from './schedule.dto';

export class SetMasterScheduleRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  readonly branchId!: string;

  @ApiProperty({ type: [WeeklyPatternDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPatternDayDto)
  readonly weeklyPattern!: readonly WeeklyPatternDayDto[];
}

export class AddMasterUnavailabilityRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  readonly branchId!: string;

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
