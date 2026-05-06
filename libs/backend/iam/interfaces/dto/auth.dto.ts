import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterOwnerRequestDto {
  @ApiProperty({ example: 'owner@studio.com', format: 'email' })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  declare email: string;

  @ApiProperty({ example: '+79991234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare phone: string;

  @ApiProperty({ example: 'Str0ngP@ss', minLength: 8 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  declare password: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare fullName: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'owner@studio.com', format: 'email' })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  declare email: string;

  @ApiProperty({ example: 'Str0ngP@ss' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare password: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare deviceFingerprint: string;
}

export class OtpRequestDto {
  @ApiProperty({ example: '+79991234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare phone: string;
}

export class OtpVerifyRequestDto {
  @ApiProperty({ example: '+79991234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare phone: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare code: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare deviceFingerprint: string;
}

export class RefreshRequestDto {
  @ApiProperty({ description: 'Refresh token value' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare refreshToken: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare deviceFingerprint: string;
}

export class LogoutRequestDto {
  @ApiProperty({ description: 'Refresh token to revoke' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  declare refreshToken: string;
}

export class LoginResponseUserDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty()
  declare fullName: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'MASTER', 'CLIENT'] })
  declare role: string;
}

export class LoginResponseDto {
  @ApiProperty()
  declare accessToken: string;

  @ApiProperty()
  declare refreshToken: string;

  @ApiProperty({ description: 'Token TTL in seconds' })
  declare expiresIn: number;

  @ApiProperty({ type: LoginResponseUserDto })
  declare user: LoginResponseUserDto;
}
