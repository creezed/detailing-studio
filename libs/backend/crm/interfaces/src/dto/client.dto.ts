import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConsentInputDto {
  @ApiProperty({ enum: ['PERSONAL_DATA_PROCESSING', 'MARKETING_NOTIFICATIONS'] })
  @IsEnum(['PERSONAL_DATA_PROCESSING', 'MARKETING_NOTIFICATIONS'])
  declare type: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  declare policyVersion?: string;
}

export class CreateClientRequestDto {
  @ApiProperty({ example: 'Иванов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare lastName: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare firstName: string;

  @ApiPropertyOptional({ example: 'Иванович' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare middleName?: string | null;

  @ApiProperty({ example: '+79161234567' })
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'phone must be in E.164 format (+7XXXXXXXXXX)' })
  declare phone: string;

  @ApiPropertyOptional({ example: 'ivan@example.com' })
  @IsOptional()
  @IsEmail()
  declare email?: string | null;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  declare birthDate?: string | null;

  @ApiPropertyOptional({ enum: ['INSTAGRAM', 'REFERRAL', 'DIRECT', 'OTHER'] })
  @IsOptional()
  @IsString()
  declare source?: string | null;

  @ApiPropertyOptional({ example: 'VIP клиент' })
  @IsOptional()
  @IsString()
  declare comment?: string;

  @ApiProperty({ type: [ConsentInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentInputDto)
  declare consents: ConsentInputDto[];

  @ApiPropertyOptional({ enum: ['REGULAR', 'GUEST'], default: 'REGULAR' })
  @IsOptional()
  @IsEnum(['REGULAR', 'GUEST'])
  declare type?: string;
}

export class UpdateClientRequestDto {
  @ApiPropertyOptional({ example: 'Иванов' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare lastName?: string;

  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare firstName?: string;

  @ApiPropertyOptional({ example: 'Иванович' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare middleName?: string | null;

  @ApiPropertyOptional({ example: '+79161234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'phone must be in E.164 format (+7XXXXXXXXXX)' })
  declare phone?: string;

  @ApiPropertyOptional({ example: 'ivan@example.com' })
  @IsOptional()
  @IsEmail()
  declare email?: string | null;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  declare birthDate?: string | null;

  @ApiPropertyOptional({ enum: ['INSTAGRAM', 'REFERRAL', 'DIRECT', 'OTHER'] })
  @IsOptional()
  @IsString()
  declare source?: string | null;

  @ApiPropertyOptional({ example: 'VIP клиент' })
  @IsOptional()
  @IsString()
  declare comment?: string;
}

export class AnonymizeClientRequestDto {
  @ApiProperty({ example: 'По запросу клиента согласно 152-ФЗ' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  declare anonymizationRequestId?: string | null;
}

export class ClientListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  declare fullName: string;

  @ApiProperty({ example: '+79161234567' })
  declare phone: string;

  @ApiProperty({ enum: ['REGULAR', 'GUEST'] })
  declare type: string;

  @ApiProperty({ enum: ['ACTIVE', 'ANONYMIZED'] })
  declare status: string;

  @ApiProperty()
  declare createdAt: string;
}

export class ClientDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty()
  declare fullName: { last: string; first: string; middle: string | null };

  @ApiProperty({ example: '+79161234567' })
  declare phone: string;

  @ApiPropertyOptional({ example: 'ivan@example.com' })
  declare email: string | null;

  @ApiPropertyOptional({ example: '1990-05-15' })
  declare birthDate: string | null;

  @ApiPropertyOptional({ enum: ['INSTAGRAM', 'REFERRAL', 'DIRECT', 'OTHER'] })
  declare source: string | null;

  @ApiProperty({ enum: ['REGULAR', 'GUEST'] })
  declare type: string;

  @ApiProperty({ enum: ['ACTIVE', 'ANONYMIZED'] })
  declare status: string;

  @ApiPropertyOptional()
  declare comment: string;

  @ApiProperty()
  declare createdAt: string;

  @ApiPropertyOptional()
  declare anonymizedAt: string | null;
}

export class PaginatedClientsResponseDto {
  @ApiProperty({ type: [ClientListItemResponseDto] })
  declare items: ClientListItemResponseDto[];

  @ApiProperty()
  declare total: number;

  @ApiProperty()
  declare page: number;

  @ApiProperty()
  declare pageSize: number;
}

export class AddVehicleRequestDto {
  @ApiProperty({ example: 'BMW' })
  @IsString()
  @IsNotEmpty()
  declare make: string;

  @ApiProperty({ example: 'X5' })
  @IsString()
  @IsNotEmpty()
  declare model: string;

  @ApiProperty({
    example: 'SUV',
    enum: ['SEDAN', 'HATCHBACK', 'CROSSOVER', 'SUV', 'MINIVAN', 'PICKUP', 'COUPE', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  declare bodyType: string;

  @ApiPropertyOptional({ example: 'А001АА777' })
  @IsOptional()
  @IsString()
  declare licensePlate?: string | null;

  @ApiPropertyOptional({ example: 'WBAPH5C55BA123456', minLength: 17, maxLength: 17 })
  @IsOptional()
  @IsString()
  declare vin?: string | null;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  declare year?: number | null;

  @ApiPropertyOptional({ example: 'Чёрный' })
  @IsOptional()
  @IsString()
  declare color?: string | null;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  declare comment?: string;
}

export class UpdateVehicleRequestDto {
  @ApiPropertyOptional({ example: 'BMW' })
  @IsOptional()
  @IsString()
  declare make?: string;

  @ApiPropertyOptional({ example: 'X5' })
  @IsOptional()
  @IsString()
  declare model?: string;

  @ApiPropertyOptional({ example: 'SUV' })
  @IsOptional()
  @IsString()
  declare bodyType?: string;

  @ApiPropertyOptional({ example: 'А001АА777' })
  @IsOptional()
  @IsString()
  declare licensePlate?: string | null;

  @ApiPropertyOptional({ example: 'WBAPH5C55BA123456' })
  @IsOptional()
  @IsString()
  declare vin?: string | null;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  declare year?: number | null;

  @ApiPropertyOptional({ example: 'Чёрный' })
  @IsOptional()
  @IsString()
  declare color?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare comment?: string;
}

export class GiveConsentRequestDto {
  @ApiProperty({ enum: ['PERSONAL_DATA_PROCESSING', 'MARKETING_NOTIFICATIONS'] })
  @IsEnum(['PERSONAL_DATA_PROCESSING', 'MARKETING_NOTIFICATIONS'])
  declare type: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  declare policyVersion?: string;
}

export class RequestAnonymizationDto {
  @ApiProperty({ example: 'По запросу клиента' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class CancelAnonymizationDto {
  @ApiProperty({ example: 'Клиент передумал' })
  @IsString()
  @IsNotEmpty()
  declare reason: string;
}

export class DataExportResponseDto {
  @ApiProperty({ example: 'https://storage.local/exports/client-xxx.json' })
  declare signedUrl: string;

  @ApiProperty()
  declare expiresAt: string;
}
