import { join } from 'node:path';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { CatalogInfrastructureModule } from '@det/backend-catalog-infrastructure';
import { CatalogInterfacesModule } from '@det/backend-catalog-interfaces';
import { IamInfrastructureModule } from '@det/backend-iam-infrastructure';
import { IamInterfacesModule } from '@det/backend-iam-interfaces';

import { authConfig } from '../config/auth.config';
import { databaseConfig } from '../config/database.config';
import { emailConfig } from '../config/email.config';
import { minioConfig } from '../config/minio.config';
import { smsConfig } from '../config/sms.config';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { HealthController } from '../health/health.controller';
import { MultiPathI18nLoader } from '../i18n/multi-path-i18n.loader';
import { TransactionalInterceptor } from '../interceptors/transactional.interceptor';

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
        registerRequestContext: true,
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'ru',
      loader: MultiPathI18nLoader,
      loaderOptions: {
        paths: [
          join(process.cwd(), 'libs/backend/iam/interfaces/i18n'),
          join(process.cwd(), 'libs/backend/shared/ddd/i18n'),
        ],
      },
      resolvers: [new AcceptLanguageResolver()],
    }),
    CatalogInfrastructureModule,
    CatalogInterfacesModule,
    IamInfrastructureModule,
    IamInterfacesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransactionalInterceptor },
  ],
})
export class AppModule {}
