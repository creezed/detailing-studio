import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBayRequestDto {
  @ApiProperty({ example: 'Бокс 1' })
  @IsString()
  @IsNotEmpty()
  readonly name!: string;
}

export class UpdateBayRequestDto {
  @ApiProperty({ example: 'Бокс 2' })
  @IsString()
  @IsNotEmpty()
  readonly name!: string;
}

export class BayCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;
}

export class BayResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ format: 'uuid' })
  readonly branchId!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty()
  readonly isActive!: boolean;
}
