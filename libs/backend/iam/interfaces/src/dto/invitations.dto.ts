import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const ROLES = ['OWNER', 'MANAGER', 'MASTER', 'CLIENT'] as const;

export class IssueInvitationRequestDto {
  @ApiProperty({ example: 'user@studio.com', format: 'email' })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  declare email: string;

  @ApiProperty({ enum: ROLES })
  @IsEnum(ROLES, { message: i18nValidationMessage('validation.IS_ENUM') })
  declare role: string;

  @ApiProperty({ type: [String], description: 'Branch IDs to grant access to' })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsString({ each: true, message: i18nValidationMessage('validation.IS_STRING') })
  declare branchIds: string[];
}

export class AcceptInvitationRequestDto {
  @ApiProperty({ minLength: 8 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  declare password: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare fullName: string;

  @ApiProperty({ example: '+79991234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare phone: string;
}
