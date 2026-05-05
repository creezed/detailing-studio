import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

const ROLES = ['OWNER', 'MANAGER', 'MASTER', 'CLIENT'] as const;

export class IssueInvitationRequestDto {
  @ApiProperty({ example: 'user@studio.com', format: 'email' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ enum: ROLES })
  @IsEnum(ROLES)
  declare role: string;

  @ApiProperty({ type: [String], description: 'Branch IDs to grant access to' })
  @IsArray()
  @IsString({ each: true })
  declare branchIds: string[];
}

export class AcceptInvitationRequestDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  declare password: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @IsNotEmpty()
  declare fullName: string;

  @ApiProperty({ example: '+79991234567' })
  @IsString()
  @IsNotEmpty()
  declare phone: string;
}
