import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { IamInfrastructureModule } from '@det/backend/iam/infrastructure';
import { IamInterfacesModule } from '@det/backend/iam/interfaces';

import { authConfig } from '../config/auth.config';
import { databaseConfig } from '../config/database.config';
import { emailConfig } from '../config/email.config';
import { minioConfig } from '../config/minio.config';
import { smsConfig } from '../config/sms.config';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { HealthController } from '../health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [databaseConfig, authConfig, minioConfig, smsConfig, emailConfig],
    }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoLoadEntities: true,
        clientUrl: configService.getOrThrow<string>('database.url'),
        connect: false,
        discovery: {
          warnWhenNoEntities: false,
        },
        driver: PostgreSqlDriver,
      }),
    }),
    IamInfrastructureModule,
    IamInterfacesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
