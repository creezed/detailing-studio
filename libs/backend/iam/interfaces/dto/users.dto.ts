import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  declare oldPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  declare newPassword: string;
}

export class BlockUserRequestDto {
  @ApiProperty({ description: 'Reason for blocking' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty({ format: 'email' })
  declare email: string;

  @ApiProperty()
  declare phone: string;

  @ApiProperty()
  declare fullName: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'MASTER', 'CLIENT'] })
  declare role: string;

  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED', 'ARCHIVED'] })
  declare status: string;
}
