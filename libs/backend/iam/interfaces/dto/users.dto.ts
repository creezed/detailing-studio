import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordRequestDto {
  @ApiProperty({ minLength: 8 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  declare oldPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  declare newPassword: string;
}

export class BlockUserRequestDto {
  @ApiProperty({ description: 'Reason for blocking' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
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
