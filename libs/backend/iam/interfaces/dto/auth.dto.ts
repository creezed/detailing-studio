import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterOwnerRequestDto {
  @ApiProperty({ example: 'owner@studio.com', format: 'email' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: '+79991234567' })
  @IsString()
  @IsNotEmpty()
  declare phone: string;

  @ApiProperty({ example: 'Str0ngP@ss', minLength: 8 })
  @IsString()
  @MinLength(8)
  declare password: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @IsNotEmpty()
  declare fullName: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'owner@studio.com', format: 'email' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'Str0ngP@ss' })
  @IsString()
  @IsNotEmpty()
  declare password: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString()
  @IsNotEmpty()
  declare deviceFingerprint: string;
}

export class OtpRequestDto {
  @ApiProperty({ example: '+79991234567' })
  @IsString()
  @IsNotEmpty()
  declare phone: string;
}

export class OtpVerifyRequestDto {
  @ApiProperty({ example: '+79991234567' })
  @IsString()
  @IsNotEmpty()
  declare phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  declare code: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString()
  @IsNotEmpty()
  declare deviceFingerprint: string;
}

export class RefreshRequestDto {
  @ApiProperty({ description: 'Refresh token value' })
  @IsString()
  @IsNotEmpty()
  declare refreshToken: string;

  @ApiProperty({ example: 'browser-fp-xyz' })
  @IsString()
  @IsNotEmpty()
  declare deviceFingerprint: string;
}

export class LogoutRequestDto {
  @ApiProperty({ description: 'Refresh token to revoke' })
  @IsString()
  @IsNotEmpty()
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
